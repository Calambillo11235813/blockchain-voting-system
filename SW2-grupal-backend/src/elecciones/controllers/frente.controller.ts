import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
   * Crea un frente.
   * @param crearFrenteDto Datos del frente.
   * @returns Frente creado.
   */
  @Post()
  async crearFrente(@Body() crearFrenteDto: CrearFrenteDto): Promise<ApiResponse<Frente>> {
    return this.frenteService.crearFrente(crearFrenteDto);
  }

  /**
   * Lista todos los frentes.
   * @returns Lista de frentes.
   */
  @Get('lista')
  async listarFrentes(): Promise<ApiResponse<Frente[]>> {
    return this.frenteService.listarFrentes();
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
