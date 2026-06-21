import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CandidatoService } from 'src/elecciones/services/candidato.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { CrearCandidatoDto } from 'src/elecciones/dto/candidato/crear-candidato.dto';
import { ActualizarCandidatoDto } from 'src/elecciones/dto/candidato/actualizar-candidato.dto';
import { VotoService } from 'src/elecciones/services/voto.service';
import { EmitirVotoDto } from 'src/elecciones/dto/voto/emitir-voto.dto';
import { EmitirVotoBatchDto } from 'src/elecciones/dto/voto/emitir-voto-batch.dto';
import { VotoComprobante, VotoBatchComprobante } from 'src/elecciones/services/voto.service';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';
import { Elector } from 'src/electores/entities/elector.entity';


/**
 * Controlador del dominio de candidatos.
 */
@Controller('elecciones/candidato')
export class CandidatoController {
  constructor(
    private readonly candidatoService: CandidatoService,
    private readonly votoService: VotoService,
  ) {}

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
   * Lista todos los candidatos, opcionalmente filtrados por elección.
   */
  @Get('lista')
  async listarCandidatos(
    @Query('eleccionId') eleccionId?: string,
  ): Promise<ApiResponse<Candidato[]>> {
    return this.candidatoService.listarCandidatos(eleccionId);
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



  /**
   * CU-12, CU-13, CU-14: Registra de manera segura un voto en la blockchain
   * y guarda el registro de auditoría en la base de datos de forma anónima.
   *
   * @param emitirVotoDto Datos de votación.
   * @returns Comprobante de voto con el hash de transacción.
   */
  @Post('votar')
  async emitirVoto(
    @Body() emitirVotoDto: EmitirVotoDto,
  ): Promise<ApiResponse<VotoComprobante>> {
    return this.votoService.votar(
      emitirVotoDto.electorId,
      emitirVotoDto.eleccionId,
      emitirVotoDto.eleccionCargoId,
      emitirVotoDto.candidatoId,
    );
  }

  /**
   * CU-12/13/14 (Crucero): Registra un lote de votos en una sola transacción blockchain.
   * Requiere JWT; el electorId y estamento se infieren de la sesión autenticada.
   */
  @Post('votar-batch')
  @UseGuards(JwtAuthGuard)
  async emitirVotoBatch(
    @Body() emitirVotoBatchDto: EmitirVotoBatchDto,
    @Req() req: { user: Elector },
  ): Promise<ApiResponse<VotoBatchComprobante>> {
    return this.votoService.votarBatch(
      req.user,
      emitirVotoBatchDto.eleccionId,
      emitirVotoBatchDto.selecciones,
    );
  }
}
