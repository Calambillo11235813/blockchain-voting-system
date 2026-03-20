import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
  BadRequestException,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AwsService } from '../services/aws.service';
import { Request } from 'express';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';

@Controller('aws')
export class AwsController {
  constructor(private readonly awsService: AwsService) { }

  /**
   * Extrae texto de un documento.
   * @param req - Información de la solicitud.
   * @param files - Archivo del documento.
   * @returns Texto extraído del documento.
   */
  @Post('extract-text')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @UseInterceptors(FilesInterceptor('files', 1))
  @HttpCode(HttpStatus.OK)
  async extractText(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length !== 1) {
      throw new BadRequestException('Debes subir el archivo del documento');
    }

    const documentFile = files[0];

    try {
      const extractedText = await this.awsService.extractTextFromDocument(documentFile.buffer);

      return {
        statusCode: HttpStatus.OK,
        message: 'Texto extraído exitosamente',
        data: { extractedText },
      };
    } catch (error) {
      throw new BadRequestException(`Error al extraer texto: ${error.message}`);
    }
  }

  /**
   * Compara la foto del usuario con la foto del documento.
   * @param files - Archivos (documento y selfie).
   * @returns Resultado de la comparación facial.
   */
  @Post('compare-face')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @UseInterceptors(FilesInterceptor('files', 2))
  @HttpCode(HttpStatus.OK)
  async compareFace(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length !== 2) {
      throw new BadRequestException('Debes subir dos fotos: documento y selfie.');
    }

    const userId = req.userId;
    const tenantId = req.tenantId;
    const [documentFile, selfieFile] = files;

    try {
      const isFaceMatch = await this.awsService.compareFace(
        userId,
        tenantId,
        documentFile.buffer,
        selfieFile.buffer,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Comparación facial completada',
        data: { isFaceMatch },
      };
    } catch (error) {
      throw new BadRequestException(`Error al comparar las fotos: ${error.message}`);
    }
  }

  /**
   * Compara la foto del usuario con la foto del documento usando ambos lados.
   * @param files - Archivos (anverso, reverso y selfie).
   * @returns Resultado de la comparación facial.
   */
  @Post('compare-faces')
  @UseGuards(AuthSaasGuard, AuthTenantGuard)
  @UseInterceptors(FilesInterceptor('files', 3))
  @HttpCode(HttpStatus.OK)
  async compareFaces(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length !== 3) {
      throw new BadRequestException('Debes subir tres fotos: anverso, reverso y selfie.');
    }

    const userId = req.userId;
    const tenantId = req.tenantId;
    const [frontFile, backFile, selfieFile] = files;

    try {
      const isFaceMatch = await this.awsService.compareFacesWithDocument(
        userId,
        tenantId,
        frontFile.buffer,
        backFile.buffer,
        selfieFile.buffer,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Comparación facial completada',
        data: { isFaceMatch },
      };
    } catch (error) {
      throw new BadRequestException(`Error al comparar las fotos: ${error.message}`);
    }
  }
}