import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EleccionesService } from '../services/elecciones.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Eleccion } from '../entities/eleccion.entity';
import { CrearEleccionDto } from '../dto/eleccion/crear-eleccion.dto';
import { ActualizarEleccionDto } from '../dto/eleccion/actualizar-eleccion.dto';

/**
 * Controlador del dominio de elecciones facultativas.
 */
@Controller('elecciones')
export class EleccionesController {
  constructor(private readonly eleccionesService: EleccionesService) {}

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
}
