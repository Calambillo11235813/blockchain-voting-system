import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { FrenteService } from 'src/elecciones/services/frente.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { CrearFrenteDto } from 'src/elecciones/dto/frente/crear-frente.dto';
import { ActualizarFrenteDto } from 'src/elecciones/dto/frente/actualizar-frente.dto';

/**
 * Controlador del dominio de frentes.
 */
@Controller('elecciones/frente')
export class FrenteController {
  constructor(private readonly frenteService: FrenteService) {}

  /**
   * Registra un frente para competir por un cargo en una elección.
   * @param eleccionCargoId Identificador UUID de la instancia del cargo en la eleccion.
   * @param crearFrenteDto Datos del frente (incluyendo candidatos opcionales).
   * @returns Frente creado con sus candidatos.
   */
  @Post(':eleccionCargoId')
  async registrarFrente(
    @Param('eleccionCargoId', ParseUUIDPipe) eleccionCargoId: string,
    @Body() crearFrenteDto: CrearFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    return this.frenteService.registrarFrente(eleccionCargoId, crearFrenteDto);
  }

  /**
   * Lista todos los frentes que compiten por un EleccionCargo.
   * @param eleccionCargoId Identificador UUID de la instancia del cargo en la eleccion.
   * @returns Lista de frentes.
   */
  @Get('eleccion-cargo/:eleccionCargoId/lista')
  async listarFrentesPorEleccionCargo(
    @Param('eleccionCargoId', ParseUUIDPipe) eleccionCargoId: string,
  ): Promise<ApiResponse<Frente[]>> {
    return this.frenteService.listarFrentesPorEleccionCargo(eleccionCargoId);
  }

  /**
   * Lista todos los frentes a nivel global, opcionalmente filtrados por elección.
   */
  @Get('lista')
  async listarFrentes(
    @Query('eleccionId') eleccionId?: string,
  ): Promise<ApiResponse<Frente[]>> {
    return this.frenteService.listarFrentes(eleccionId);
  }

  /**
   * Obtiene un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @returns Frente encontrado.
   */
  @Get(':frenteId')
  async obtenerFrentePorId(
    @Param('frenteId', ParseUUIDPipe) frenteId: string,
  ): Promise<ApiResponse<Frente>> {
    return this.frenteService.obtenerFrentePorId(frenteId);
  }

  /**
   * Actualiza un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @param actualizarFrenteDto Campos a actualizar.
   * @returns Frente actualizado.
   */
  @Patch(':frenteId')
  async actualizarFrente(
    @Param('frenteId', ParseUUIDPipe) frenteId: string,
    @Body() actualizarFrenteDto: ActualizarFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    return this.frenteService.actualizarFrente(frenteId, actualizarFrenteDto);
  }

  /**
   * Elimina un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @returns Resultado de eliminacion.
   */
  @Delete(':frenteId')
  async eliminarFrente(
    @Param('frenteId', ParseUUIDPipe) frenteId: string,
  ): Promise<ApiResponse<null>> {
    return this.frenteService.eliminarFrente(frenteId);
  }
}
