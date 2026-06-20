import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EleccionesLegacyService } from '../services/elecciones.service';
import { PadronService } from '../services/padron.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Eleccion } from '../entities/eleccion.entity';
import { CrearEleccionDto } from '../dto/eleccion/crear-eleccion.dto';
import { ActualizarEleccionDto } from '../dto/eleccion/actualizar-eleccion.dto';

/**
 * Controlador del dominio de elecciones facultativas.
 */
@Controller('elecciones')
export class EleccionesController {
  constructor(
    private readonly eleccionesService: EleccionesLegacyService,
    private readonly padronService: PadronService,
  ) {}

  /**
   * Crea una eleccion facultativa.
   * @param crearEleccionDto Datos de la eleccion.
   * @returns Eleccion creada.
   */
  @Post()
  async crearEleccion(
    @Body() crearEleccionDto: CrearEleccionDto,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.crearEleccion(crearEleccionDto);
  }

  /**
   * Lista todas las elecciones.
   * @returns Lista de elecciones.
   */
  @Get()
  async listarElecciones(): Promise<ApiResponse<Eleccion[]>> {
    return this.eleccionesService.listarElecciones();
  }

  /**
   * Obtiene una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion encontrada.
   */
  @Get(':eleccionId')
  async obtenerEleccionPorId(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.obtenerEleccionPorId(eleccionId);
  }

  /**
   * Actualiza una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param actualizarEleccionDto Campos a actualizar.
   * @returns Eleccion actualizada.
   */
  @Patch(':eleccionId')
  async actualizarEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() actualizarEleccionDto: ActualizarEleccionDto,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.actualizarEleccion(eleccionId, actualizarEleccionDto);
  }

  /**
   * Activa o desactiva la restricción alfabética (interruptor maestro).
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion actualizada.
   */
  @Patch(':eleccionId/toggle-restriccion')
  async toggleRestriccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.toggleRestriccionAlfabetica(eleccionId);
  }

  /**
   * Elimina una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Resultado de eliminacion.
   */
  @Delete(':eleccionId')
  async eliminarEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<null>> {
    return this.eleccionesService.eliminarEleccion(eleccionId);
  }

  /**
   * Carga masiva del padrón electoral desde un archivo Excel (.xlsx).
   * @param eleccionId Identificador UUID de la eleccion.
   * @param file Archivo Excel subido.
   * @returns Estadísticas de la carga masiva.
   */
  @Post(':eleccionId/padron')
  @UseInterceptors(FileInterceptor('file'))
  async cargarPadronElectoral(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<any>> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar un archivo Excel (.xlsx) en el campo "file".');
    }

    const nombreArchivo = file.originalname?.toLowerCase() ?? '';
    const esXlsx =
      nombreArchivo.endsWith('.xlsx') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!esXlsx) {
      throw new BadRequestException('El archivo debe tener formato .xlsx.');
    }

    return this.padronService.cargarPadronElectoral(eleccionId, file.buffer);
  }

  /**
   * Lista el padrón electoral de una elección.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param page Número de página (1-indexed).
   * @param limit Registros por página.
   * @returns Lista paginada del padrón.
   */
  @Get(':eleccionId/padron')
  async listarPadronElectoral(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estamento') estamento?: string,
  ): Promise<ApiResponse<any>> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.padronService.listarPadronElectoral(eleccionId, pageNumber, limitNumber, estamento);
  }
}
