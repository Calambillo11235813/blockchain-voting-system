import { BadRequestException, Controller, HttpCode, HttpStatus, Post, Get, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EstudiantesService } from './estudiantes.service';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) { }

  /**
   * Retorna la cantidad total de estudiantes registrados en el padrón.
   * @returns Total de estudiantes.
   */
  @Get('total')
  @HttpCode(HttpStatus.OK)
  async obtenerTotalEstudiantes(): Promise<ApiResponse<{ total: number }>> {
    const total = await this.estudiantesService.obtenerTotalEstudiantes();
    return createApiResponse(HttpStatus.OK, { total }, 'Total de estudiantes obtenido.');
  }

  /**
   * Carga el padron de estudiantes desde un archivo Excel (.xlsx).
   * @param file Archivo Excel cargado en memoria.
   * @returns Resultado de la carga del padron.
   * @throws BadRequestException si el archivo no es valido.
   */
  @Post('cargar-padron')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @HttpCode(HttpStatus.OK)
  async cargarPadron(
    @UploadedFile() file: Express.Multer.File
  ): Promise<ApiResponse<{ total: number; inserted: number; updated: number; errors: string[] }>> {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser .xlsx');
    }

    return this.estudiantesService.cargarPadronDesdeExcel(file.buffer);
  }
}
