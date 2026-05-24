import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { CrearCandidatoDto } from 'src/elecciones/dto/candidato/crear-candidato.dto';
import { ActualizarCandidatoDto } from 'src/elecciones/dto/candidato/actualizar-candidato.dto';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';



/**
 * Servicio de aplicacion para el dominio de candidatos.
 */
@Injectable()
export class CandidatoService {
  constructor(
    @InjectRepository(Candidato)
    private readonly candidatoRepository: Repository<Candidato>,
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Crea un candidato.
   * @param crearCandidatoDto Datos del candidato.
   * @returns Candidato creado.
   */
  async crearCandidato(crearCandidatoDto: CrearCandidatoDto): Promise<ApiResponse<Candidato>> {
    const frente = await this.buscarFrentePorIdOrThrow(crearCandidatoDto.frenteId);

    const candidato = this.candidatoRepository.create({
      ci: crearCandidatoDto.ci,
      nombres: crearCandidatoDto.nombres,
      apellidos: crearCandidatoDto.apellidos,
      fotoUrl: crearCandidatoDto.fotoUrl ?? null,
      frente,
    });

    const guardado = await this.candidatoRepository.save(candidato);
    return createApiResponse(HttpStatus.CREATED, guardado, 'Candidato creado correctamente.');
  }

  /**
   * Lista todos los candidatos.
   * @returns Lista de candidatos.
   */
  async listarCandidatos(): Promise<ApiResponse<Candidato[]>> {
    const candidatos = await this.candidatoRepository.find({
      relations: { frente: true },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, candidatos, 'Candidatos listados correctamente.');
  }

  /**
   * Obtiene un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @returns Candidato encontrado.
   */
  async obtenerCandidatoPorId(candidatoId: string): Promise<ApiResponse<Candidato>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);
    return createApiResponse(HttpStatus.OK, candidato, 'Candidato obtenido correctamente.');
  }

  /**
   * Actualiza un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @param actualizarCandidatoDto Campos a actualizar.
   * @returns Candidato actualizado.
   */
  async actualizarCandidato(
    candidatoId: string,
    actualizarCandidatoDto: ActualizarCandidatoDto,
  ): Promise<ApiResponse<Candidato>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);

    if (actualizarCandidatoDto.frenteId) {
      candidato.frente = await this.buscarFrentePorIdOrThrow(actualizarCandidatoDto.frenteId);
    }

    candidato.ci = actualizarCandidatoDto.ci ?? candidato.ci;
    candidato.nombres = actualizarCandidatoDto.nombres ?? candidato.nombres;
    candidato.apellidos = actualizarCandidatoDto.apellidos ?? candidato.apellidos;
    candidato.fotoUrl = actualizarCandidatoDto.fotoUrl ?? candidato.fotoUrl;

    const actualizado = await this.candidatoRepository.save(candidato);
    return createApiResponse(HttpStatus.OK, actualizado, 'Candidato actualizado correctamente.');
  }

  /**
   * Elimina un candidato por ID.
   * @param candidatoId Identificador UUID del candidato.
   * @returns Resultado de eliminacion.
   */
  async eliminarCandidato(candidatoId: string): Promise<ApiResponse<null>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);
    await this.candidatoRepository.remove(candidato);
    return createApiResponse(HttpStatus.OK, null, 'Candidato eliminado correctamente.');
  }



  /**
   * Busca un frente por ID o lanza excepcion.
   * @param frenteId Identificador UUID del frente.
   * @returns Frente encontrado.
   * @throws NotFoundException Si el frente no existe.
   */
  private async buscarFrentePorIdOrThrow(frenteId: string): Promise<Frente> {
    const frente = await this.frenteRepository.findOne({ where: { id: frenteId } });

    if (!frente) {
      throw new NotFoundException(`No se encontro el frente con id ${frenteId}`);
    }

    return frente;
  }

  /**
   * Busca un candidato por ID o lanza excepcion.
   * @param candidatoId Identificador UUID del candidato.
   * @returns Candidato encontrado.
   * @throws NotFoundException Si el candidato no existe.
   */
  private async buscarCandidatoPorIdOrThrow(candidatoId: string): Promise<Candidato> {
    const candidato = await this.candidatoRepository.findOne({
      where: { id: candidatoId },
      relations: { frente: true },
    });

    if (!candidato) {
      throw new NotFoundException(`No se encontro el candidato con id ${candidatoId}`);
    }

    return candidato;
  }
}
