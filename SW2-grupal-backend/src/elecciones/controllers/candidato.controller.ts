import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CandidatoService } from 'src/elecciones/services/candidato.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { CrearCandidatoDto } from 'src/elecciones/dto/candidato/crear-candidato.dto';
import { ActualizarCandidatoDto } from 'src/elecciones/dto/candidato/actualizar-candidato.dto';

/**
 * Controlador del dominio de candidatos.
 */
@Controller('elecciones/candidato')
export class CandidatoController {
  constructor(private readonly candidatoService: CandidatoService) {}

  /**
   * Crea un candidato.
   * @param crearCandidatoDto Datos del candidato.
   * @returns Candidato creado.
   */
  @Post()
  async crearCandidato(
    @Body() crearCandidatoDto: CrearCandidatoDto,
  ): Promise<ApiResponse<Candidato>> {
    return this.candidatoService.crearCandidato(crearCandidatoDto);
  }

  /**
   * Lista todos los candidatos.
   * @returns Lista de candidatos.
   */
  @Get('lista')
  async listarCandidatos(): Promise<ApiResponse<Candidato[]>> {
    return this.candidatoService.listarCandidatos();
  }

  /**
   * Obtiene un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @returns Candidato encontrado.
   */
  @Get(':candidatoId')
  async obtenerCandidatoPorId(
    @Param('candidatoId', ParseUUIDPipe) candidatoId: string,
  ): Promise<ApiResponse<Candidato>> {
    return this.candidatoService.obtenerCandidatoPorId(candidatoId);
  }

  /**
   * Actualiza un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @param actualizarCandidatoDto Campos a actualizar.
   * @returns Candidato actualizado.
   */
  @Patch(':candidatoId')
  async actualizarCandidato(
    @Param('candidatoId', ParseUUIDPipe) candidatoId: string,
    @Body() actualizarCandidatoDto: ActualizarCandidatoDto,
  ): Promise<ApiResponse<Candidato>> {
    return this.candidatoService.actualizarCandidato(candidatoId, actualizarCandidatoDto);
  }

  /**
   * Elimina un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @returns Resultado de eliminacion.
   */
  @Delete(':candidatoId')
  async eliminarCandidato(
    @Param('candidatoId', ParseUUIDPipe) candidatoId: string,
  ): Promise<ApiResponse<null>> {
    return this.candidatoService.eliminarCandidato(candidatoId);
  }
}
