import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CandidatoService } from 'src/elecciones/services/candidato.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { CrearCandidatoDto } from 'src/elecciones/dto/candidato/crear-candidato.dto';
import { ActualizarCandidatoDto } from 'src/elecciones/dto/candidato/actualizar-candidato.dto';
import { CrearVotoBlockchainDto } from 'src/elecciones/dto/voto/crear-voto-blockchain.dto';
import { VotoService } from 'src/elecciones/services/voto.service';
import { EmitirVotoDto } from 'src/elecciones/dto/voto/emitir-voto.dto';
import { VotoComprobante } from 'src/elecciones/services/voto.service';


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
      emitirVotoDto.candidatoId,
    );
  }
}
