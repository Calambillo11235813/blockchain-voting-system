import { Controller, HttpStatus, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { BiometriaService, ResultadoValidacionIdentidad } from './biometria.service';
import { ArchivosBiometria, crearOpcionesMulterBiometria, ValidarIdentidadArchivosDto } from './dto/validar-identidad-archivos.dto';

const OPCIONES_MULTER_BIOMETRIA = crearOpcionesMulterBiometria();

@Controller('biometria')
export class BiometriaController {
  constructor(
    private readonly biometriaService: BiometriaService,
  ) { }

  /**
   * Recibe frontal, trasera y selfie para verificar identidad (HU-005).
   * @param files Archivos enviados como multipart/form-data.
   * @returns Resultado de validacion.
   */
  @Post('verificar')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontal', maxCount: 1 },
        { name: 'trasera', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      OPCIONES_MULTER_BIOMETRIA,
    ),
  )
  async verificar(
    @UploadedFiles() files: ArchivosBiometria,
  ): Promise<ApiResponse<ResultadoValidacionIdentidad>> {
    const archivosValidados = ValidarIdentidadArchivosDto.validar(files);
    const resultado = await this.biometriaService.validarIdentidad(archivosValidados);

    return createApiResponse(
      HttpStatus.OK,
      resultado,
      'Verificacion biometrica procesada'
    );
  }
}
