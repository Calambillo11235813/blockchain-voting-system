// src/identity-verification/controllers/identity-verification.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpStatus,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { IdentityVerificationService } from '../services/identity.service';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(private readonly identityVerificationService: IdentityVerificationService) { }

  /**
   * Verifica si un usuario puede comprar una cantidad específica de tickets para un evento
   * @param req Solicitud con datos del usuario y tenant
   * @param eventId ID del evento
   * @param quantity Cantidad de tickets a comprar
   * @returns Resultado de la verificación de límite
   */
  @Get('check-limit')
  @UseGuards(AuthSaasGuard)
  @HttpCode(HttpStatus.OK)
  async checkPurchaseLimit(
    @Req() req: Request,
    @Query('eventId', ParseUUIDPipe) eventId: string,
    @Query('quantity') quantityStr: string,
  ) {
    if (!eventId) {
      throw new BadRequestException('El ID del evento es requerido');
    }

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser un número positivo');
    }

    const userId = req.userId;

    return await this.identityVerificationService.verifyPurchaseLimit(
      userId,
      eventId,
      quantity,
    );
  }

  /**
   * Procesa y verifica la identidad del usuario utilizando documentos y selfie.
   * Combina la extracción de texto, reconocimiento facial y creación de verificación.
   * @param req Solicitud con datos del usuario y tenant
   * @param files Archivos (documento frontal, documento trasero y selfie)
   * @param eventId ID del evento
   * @returns Detalles de la verificación y resultado de la comparación facial
   */
  @Post('process-verification')
  @UseGuards(AuthSaasGuard)
  @UseInterceptors(FilesInterceptor('files', 3)) // Aceptar 3 archivos: frente, reverso, selfie
  @HttpCode(HttpStatus.CREATED)
  async processVerification(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('eventId', ParseUUIDPipe) eventId: string,
  ) {
    if (!eventId) {
      throw new BadRequestException('El ID del evento es requerido');
    }

    if (!files || files.length !== 3) {
      throw new BadRequestException('Debes subir tres archivos: anverso y reverso del documento, y tu selfie');
    }

    const [frontFile, backFile, selfieFile] = files;
    const userId = req.userId;

    try {
      const result = await this.identityVerificationService.processAndCreateVerification(
        userId,
        eventId,
        frontFile.buffer,
        backFile.buffer,
        selfieFile.buffer
      );

      return result;
    } catch (error) {
      throw new BadRequestException(`Error al procesar la verificación: ${error.message}`);
    }
  }

  /**
   * Verifica si un usuario tiene una verificación de identidad activa para un evento
   * @param req Solicitud con datos del usuario y tenant
   * @param eventId ID del evento
   * @returns Estado de verificación del usuario para el evento
   */
  @Get('status')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @HttpCode(HttpStatus.OK)
  async checkVerificationStatus(
    @Req() req: Request,
    @Query('eventId', ParseUUIDPipe) eventId: string,
  ) {
    if (!eventId) {
      throw new BadRequestException('El ID del evento es requerido');
    }

    const userId = req.userId;
    const memberTenantId = req.memberTenantId;

    return await this.identityVerificationService.hasActiveVerification(
      userId,
      eventId,
      memberTenantId
    );
  }

  /**
   * Obtiene las verificaciones pendientes para un tenant
   * @param req Solicitud con datos del tenant
   * @param paginationDto Parámetros de paginación
   * @returns Lista de verificaciones pendientes
   */
  @Get('pending')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @HttpCode(HttpStatus.OK)
  async getPendingVerifications(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = req.userId;
    const memberTenantId = req.memberTenantId;

    return await this.identityVerificationService.getPendingVerifications(
      memberTenantId,
      userId,
      paginationDto
    );
  }

  /**
   * Procesa una verificación (aprobar/rechazar)
   * @param req Solicitud con datos del tenant
   * @param verificationId ID de la verificación
   * @param approveData Datos para aprobar/rechazar
   * @returns Detalles de la verificación actualizada
   */
  @Post('process/:id')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @HttpCode(HttpStatus.OK)
  async processVerificationDecision(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) verificationId: string,
    @Body() approveData: { approve: boolean },
  ) {
    const userId = req.userId;
    const memberTenantId = req.memberTenantId;

    return await this.identityVerificationService.processVerification(
      verificationId,
      approveData.approve,
      userId,
      memberTenantId
    );
  }
}