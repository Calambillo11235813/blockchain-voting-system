import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerification } from '../entities/identity-verification.entity';
import * as fs from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { handleError } from 'src/common/helpers/function-helper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Event } from 'src/elecciones/entities/event.entity';

@Injectable()
export class IdentityVerificationService {
  private readonly tempDir = join('./temp');

  constructor(
    @InjectRepository(IdentityVerification)
    private identityVerificationRepository: Repository<IdentityVerification>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {
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
          id: true
        }
      });

      if (!event) {
        throw new NotFoundException(`Evento con ID ${eventId} no encontrado`);
      }

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

      // AWS removido: no se realiza reconocimiento facial
      const faceMatch = false;

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
      });

      // Si hay coincidencia facial, establecer la fecha de verificación
      if (faceMatch) {
        verification.verified_at = new Date();
      }

      const savedVerification = await this.identityVerificationRepository.save(verification);

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
   * @returns Respuesta API indicando si tiene verificación aprobada
   */
  async hasActiveVerification(userId: string, eventId: string): Promise<ApiResponse<{ isVerified: boolean }>> {
    try {
      const verification = await this.identityVerificationRepository.findOne({
        where: {
          user: { id: userId },
          event: { id: eventId },
          status: true
        }
      });

      const isVerified = !!verification;

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
   * Obtiene el listado de verificaciones pendientes
   * @param userId ID del usuario que realiza la consulta
   * @param paginationDto Parámetros de paginación
   * @returns Lista de verificaciones pendientes
   */
  async getPendingVerifications(userId: string, paginationDto: PaginationDto): Promise<ApiResponse<IdentityVerification[]>> {
    try {
      const {
        limit = 10,
        offset = 0,
        order = 'DESC',
        orderBy = 'created_at',
        page = 1
      } = paginationDto;

      const skip = page ? (page - 1) * limit : offset;

      // Construir consulta con QueryBuilder
      const queryBuilder = this.identityVerificationRepository.createQueryBuilder('verification')
        .leftJoinAndSelect('verification.user', 'user')
        .leftJoinAndSelect('verification.event', 'event')
        .where('verification.status = :status', { status: false })
        .orderBy(`verification.${orderBy}`, order)
        .skip(skip)
        .take(limit);

      const [verifications, total] = await queryBuilder.getManyAndCount();

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
   * @returns Información de la verificación actualizada
   */
  async processVerification(verificationId: string, approve: boolean, userId: string): Promise<ApiResponse<IdentityVerification>> {
    try {
      // Buscar la verificación y asegurar que pertenece al tenant
      const verification = await this.identityVerificationRepository.findOne({
        where: {
          id: verificationId
        },
        relations: ['user', 'event']
      });

      if (!verification) {
        throw new NotFoundException(`Verificación con ID ${verificationId} no encontrada o no accesible`);
      }

      verification.status = approve;
      verification.verified_at = new Date();

      const updatedVerification = await this.identityVerificationRepository.save(verification);

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
