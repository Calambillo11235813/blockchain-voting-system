import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerification } from '../entities/identity-verification.entity';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';
import { AuditService } from 'src/audit/services/audit.service';
import { MemberTenantService } from 'src/tenant/services/member-tenant.service';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { ActionType } from 'src/audit/entities/audit.entity';
import { handleError } from 'src/common/helpers/function-helper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Event } from 'src/event/entities/event.entity';

@Injectable()
export class IdentityVerificationService {
  private readonly rekognitionClient: RekognitionClient;
  private readonly textractClient: TextractClient;
  private readonly tempDir = join('./temp');

  constructor(
    @InjectRepository(IdentityVerification)
    private identityVerificationRepository: Repository<IdentityVerification>,
    @InjectRepository(TicketPurchase)
    private ticketPurchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private configService: ConfigService,
    private auditService: AuditService,
    private memberTenantService: MemberTenantService
  ) {
    this.rekognitionClient = new RekognitionClient({
      region: this.configService.get<string>('aws_region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws_access_key_id'),
        secretAccessKey: this.configService.get<string>('aws_secret_access_key'),
      },
    });

    this.textractClient = new TextractClient({
      region: this.configService.get<string>('aws_region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws_access_key_id'),
        secretAccessKey: this.configService.get<string>('aws_secret_access_key'),
      },
    });

    this.initializeTempDir();
  }

  /**
   * Inicializa el directorio temporal.
   */
  private async initializeTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error al crear el directorio temporal:', error.message);
    }
  }

  /**
   * Extrae texto de un documento utilizando AWS Textract.
   * @param documentBuffer - Buffer del documento.
   * @returns Lista de líneas extraídas.
   */
  private async extractTextFromDocument(documentBuffer: Buffer): Promise<string[]> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: documentBuffer },
      });
      const result = await this.textractClient.send(command);
      return result.Blocks.filter(block => block.BlockType === 'LINE').map(block => block.Text || '');
    } catch (error) {
      throw new InternalServerErrorException('Error al extraer texto del documento', error);
    }
  }

  /**
   * Compara las caras del documento con una selfie.
   * @param frontBuffer - Buffer del anverso del documento.
   * @param selfieBuffer - Buffer de la selfie.
   * @returns `true` si las caras coinciden; `false` de lo contrario.
   */
  private async compareFacesBuffer(sourceBuffer: Buffer, targetBuffer: Buffer): Promise<boolean> {
    try {
      const command = new CompareFacesCommand({
        SourceImage: { Bytes: sourceBuffer },
        TargetImage: { Bytes: targetBuffer },
        SimilarityThreshold: 80,
      });

      const result = await this.rekognitionClient.send(command);

      return result.FaceMatches && result.FaceMatches.length > 0;
    } catch (error) {
      throw new InternalServerErrorException('Error al comparar las fotos', error);
    }
  }

  /**
   * Valida si el usuario es miembro del tenant.
   * @param userId ID del usuario.
   * @param tenantId ID del tenant.
   * @throws UnauthorizedException si el usuario no es miembro del tenant.
   */
  private async validateUserMembership(userId: string, memberTenantId: string): Promise<string> {
    try {
      const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
      if (!existMembertenant) {
        throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
      }

      return existMembertenant.data.tenantId;
    } catch (error) {
      throw new UnauthorizedException('No tienes permiso para acceder a este tenant.', error);
    }
  }

  /**
  * Verifica si un usuario está intentando comprar más de 5 tickets para un mismo evento
  * @param userId ID del usuario que está comprando
  * @param eventId ID del evento para el que se está comprando
  * @param quantity Cantidad de tickets que se intenta comprar
  * @returns Respuesta API indicando si la compra está permitida
  */
  async verifyPurchaseLimit(userId: string, eventId: string, quantity: number): Promise<ApiResponse<{ isAllowed: boolean, currentCount: number, maxAllowed: number }>> {
    try {
      // Contar cuántos tickets ya ha comprado este usuario para este evento
      const existingTickets = await this.ticketPurchaseRepository
        .createQueryBuilder('ticketPurchase')
        .innerJoin('ticketPurchase.purchase', 'purchase')
        .innerJoin('purchase.user', 'user')
        .innerJoin('ticketPurchase.ticket', 'ticket')
        .innerJoin('ticket.section', 'section')
        .innerJoin('section.event', 'event')
        .where('user.id = :userId', { userId })
        .andWhere('event.id = :eventId', { eventId })
        .select('SUM(ticketPurchase.quantity)', 'total')
        .getRawOne();

      const currentTickets = existingTickets?.total ? parseInt(existingTickets.total, 10) : 0;
      const totalAfterPurchase = currentTickets + quantity;

      const maxTicketsPerUser = 5; // Límite de 5 tickets por usuario para un evento
      const isAllowed = totalAfterPurchase <= maxTicketsPerUser;

      // Registrar la acción en el log de auditoría
      await this.auditService.logAction(
        ActionType.VERIFY,
        'PurchaseLimit',
        null,
        userId,
        null, // No se necesita tenantId
        {
          eventId,
          currentTickets,
          requestedQuantity: quantity,
          totalAfterPurchase,
          isAllowed
        },
        null
      );

      if (!isAllowed) {
        return createApiResponse(
          HttpStatus.BAD_REQUEST,
          {
            isAllowed,
            currentCount: currentTickets,
            maxAllowed: maxTicketsPerUser
          },
          `No se puede comprar más de ${maxTicketsPerUser} tickets por usuario para el mismo evento. Actualmente tienes ${currentTickets} tickets.`
        );
      }

      return createApiResponse(
        HttpStatus.OK,
        {
          isAllowed,
          currentCount: currentTickets,
          maxAllowed: maxTicketsPerUser
        },
        'Compra dentro del límite permitido'
      );
    } catch (error) {
      throw handleError(error, {
        context: 'IdentityVerificationService.verifyPurchaseLimit',
        action: 'verify',
        entityName: 'PurchaseLimit',
        additionalInfo: {
          userId,
          eventId,
          quantity,
          message: 'Error al verificar límite de compra'
        }
      });
    }
  }


  /**
 * Procesa y valida la identidad del usuario con documentos y selfie, y crea la verificación.
 * @param userId ID del usuario
 * @param eventId ID del evento
 * @param documentFrontBuffer Buffer del anverso del documento
 * @param documentBackBuffer Buffer del reverso del documento
 * @param selfieBuffer Buffer de la selfie
 * @returns Información de la verificación creada y su resultado
 */
  async processAndCreateVerification(
    userId: string,
    eventId: string,
    documentFrontBuffer: Buffer,
    documentBackBuffer: Buffer,
    selfieBuffer: Buffer
  ): Promise<ApiResponse<{ verification: IdentityVerification, faceMatch: boolean }>> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        select: {
          id: true,
          tenantId: true
        }
      });

      if (!event) {
        throw new NotFoundException(`Evento con ID ${eventId} no encontrado`);
      }

      const tenantId = event.tenantId;

      // Verificar si ya existe una verificación para este usuario y evento
      // const existingVerification = await this.identityVerificationRepository.findOne({
      //   where: {
      //     user: { id: userId },
      //     event: { id: eventId }
      //   }
      // });

      // if (existingVerification) {
      //   return createApiResponse(
      //     HttpStatus.BAD_REQUEST,
      //     {
      //       verification: existingVerification,
      //       faceMatch: existingVerification.status
      //     },
      //     'Ya existe una verificación de identidad para este usuario en este evento'
      //   );
      // }

      // Realizar el reconocimiento facial para verificar que la selfie coincide con el documento
      const frontMatch = await this.compareFacesBuffer(documentFrontBuffer, selfieBuffer);
      let faceMatch = frontMatch;

      if (!frontMatch) {
        // Si no hay coincidencia con el frente, intentar con el reverso
        const backMatch = await this.compareFacesBuffer(documentBackBuffer, selfieBuffer);
        faceMatch = backMatch;
      }

      // Generar nombres únicos para los archivos
      const documentFrontFileName = `${uuidv4()}_document_front.jpg`;
      const documentBackFileName = `${uuidv4()}_document_back.jpg`;
      const selfieFileName = `${uuidv4()}_selfie.jpg`;

      // Rutas para guardar los archivos
      const documentFrontPath = join(this.tempDir, documentFrontFileName);
      const documentBackPath = join(this.tempDir, documentBackFileName);
      const selfiePath = join(this.tempDir, selfieFileName);

      // Guardar los archivos en el directorio temporal
      await fs.writeFile(documentFrontPath, documentFrontBuffer);
      await fs.writeFile(documentBackPath, documentBackBuffer);
      await fs.writeFile(selfiePath, selfieBuffer);

      // Crear registro de verificación
      const verification = this.identityVerificationRepository.create({
        document_url: documentFrontPath,
        selfie_url: selfiePath,
        user: { id: userId },
        event: { id: eventId },
        ...(tenantId && { tenantId }),
      });

      // Si hay coincidencia facial, establecer la fecha de verificación
      if (faceMatch) {
        verification.verified_at = new Date();
      }

      const savedVerification = await this.identityVerificationRepository.save(verification);

      // Registrar la acción en el log de auditoría
      await this.auditService.logAction(
        ActionType.CREATE,
        'IdentityVerification',
        savedVerification.id,
        userId,
        tenantId, // Usar el tenant ID obtenido
        {
          eventId,
          faceMatch,
          autoVerified: faceMatch
        },
        null
      );

      return createApiResponse(
        HttpStatus.CREATED,
        {
          verification: savedVerification,
          faceMatch
        },
        faceMatch
          ? 'Verificación de identidad aprobada automáticamente'
          : 'Documentos de verificación subidos correctamente, pendiente de aprobación'
      );
    } catch (error) {
      throw handleError(error, {
        context: 'IdentityVerificationService.processAndCreateVerification',
        action: 'create',
        entityName: 'IdentityVerification',
        additionalInfo: {
          userId,
          eventId,
          message: 'Error al procesar y crear verificación de identidad'
        }
      });
    }
  }

  /**
   * Verifica si un usuario tiene una verificación de identidad activa para un evento
   * @param userId ID del usuario
   * @param eventId ID del evento
   * @param memberTenantId ID del memberTenant
   * @returns Respuesta API indicando si tiene verificación aprobada
   */
  async hasActiveVerification(userId: string, eventId: string, memberTenantId: string): Promise<ApiResponse<{ isVerified: boolean }>> {
    try {
      // Verificar que el usuario es miembro del tenant
      const tenantId = await this.validateUserMembership(userId, memberTenantId);

      const verification = await this.identityVerificationRepository.findOne({
        where: {
          user: { id: userId },
          event: { id: eventId },
          tenantId,
          status: true
        }
      });

      const isVerified = !!verification;

      // Registrar la acción en el log de auditoría
      await this.auditService.logAction(
        ActionType.VIEW,
        'IdentityVerification',
        verification?.id || null,
        userId,
        tenantId,
        {
          eventId,
          isVerified
        },
        null
      );

      return createApiResponse(
        HttpStatus.OK,
        { isVerified },
        isVerified
          ? 'Usuario verificado para este evento'
          : 'Usuario no verificado para este evento'
      );
    } catch (error) {
      throw handleError(error, {
        context: 'IdentityVerificationService.hasActiveVerification',
        action: 'read',
        entityName: 'IdentityVerification',
        additionalInfo: {
          userId,
          eventId,
          message: 'Error al verificar estado de verificación'
        }
      });
    }
  }

  /**
   * Obtiene el listado de verificaciones pendientes para un tenant
   * @param memberTenantId ID del memberTenant
   * @param userId ID del usuario que realiza la consulta
   * @param paginationDto Parámetros de paginación
   * @returns Lista de verificaciones pendientes
   */
  async getPendingVerifications(memberTenantId: string, userId: string, paginationDto: PaginationDto): Promise<ApiResponse<IdentityVerification[]>> {
    try {
      const {
        limit = 10,
        offset = 0,
        order = 'DESC',
        orderBy = 'created_at',
        page = 1
      } = paginationDto;

      // Verificar que el usuario es miembro del tenant
      const tenantId = await this.validateUserMembership(userId, memberTenantId);

      const skip = page ? (page - 1) * limit : offset;

      // Construir consulta con QueryBuilder
      const queryBuilder = this.identityVerificationRepository.createQueryBuilder('verification')
        .leftJoinAndSelect('verification.user', 'user')
        .leftJoinAndSelect('verification.event', 'event')
        .where('verification.tenantId = :tenantId', { tenantId })
        .andWhere('verification.status = :status', { status: false })
        .orderBy(`verification.${orderBy}`, order)
        .skip(skip)
        .take(limit);

      const [verifications, total] = await queryBuilder.getManyAndCount();

      // Registrar la acción en el log de auditoría
      await this.auditService.logAction(
        ActionType.VIEW,
        'IdentityVerification',
        null,
        userId,
        tenantId,
        { status: 'pending' },
        null
      );

      return createApiResponse(
        HttpStatus.OK,
        verifications,
        'Verificaciones pendientes recuperadas con éxito',
        undefined,
        { total, page: page || Math.floor(skip / limit) + 1, limit }
      );
    } catch (error) {
      throw handleError(error, {
        context: 'IdentityVerificationService.getPendingVerifications',
        action: 'read',
        entityName: 'IdentityVerification',
        additionalInfo: {
          message: 'Error al recuperar verificaciones pendientes'
        }
      });
    }
  }

  /**
   * Aprueba o rechaza una verificación de identidad
   * @param verificationId ID de la verificación
   * @param approve true para aprobar, false para rechazar
   * @param userId ID del usuario que realiza la acción
   * @param memberTenantId ID del memberTenant
   * @returns Información de la verificación actualizada
   */
  async processVerification(verificationId: string, approve: boolean, userId: string, memberTenantId: string): Promise<ApiResponse<IdentityVerification>> {
    try {
      // Verificar que el usuario es miembro del tenant
      const tenantId = await this.validateUserMembership(userId, memberTenantId);

      // Buscar la verificación y asegurar que pertenece al tenant
      const verification = await this.identityVerificationRepository.findOne({
        where: {
          id: verificationId,
          tenantId
        },
        relations: ['user', 'event']
      });

      if (!verification) {
        throw new NotFoundException(`Verificación con ID ${verificationId} no encontrada o no accesible`);
      }

      verification.status = approve;
      verification.verified_at = new Date();

      const updatedVerification = await this.identityVerificationRepository.save(verification);

      // Registrar la acción en el log de auditoría
      await this.auditService.logAction(
        approve ? ActionType.APPROVE : ActionType.REJECT,
        'IdentityVerification',
        verificationId,
        userId,
        tenantId,
        {
          userIdVerified: verification.user.id,
          eventId: verification.event.id
        },
        null
      );

      return createApiResponse(
        HttpStatus.OK,
        updatedVerification,
        `Verificación ${approve ? 'aprobada' : 'rechazada'} con éxito`
      );
    } catch (error) {
      throw handleError(error, {
        context: 'IdentityVerificationService.processVerification',
        action: 'update',
        entityName: 'IdentityVerification',
        entityId: verificationId,
        additionalInfo: {
          approve,
          message: `Error al ${approve ? 'aprobar' : 'rechazar'} verificación`
        }
      });
    }
  }
}