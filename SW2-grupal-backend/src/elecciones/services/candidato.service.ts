import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { CrearCandidatoDto } from 'src/elecciones/dto/candidato/crear-candidato.dto';
import { ActualizarCandidatoDto } from 'src/elecciones/dto/candidato/actualizar-candidato.dto';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { esRolValidoParaAlcance } from 'src/elecciones/enums/rol-candidato.constants';

export interface DatosCandidatoTransaccion {
  ci: string;
  nombres: string;
  apellidos: string;
  fotoUrl?: string;
  frenteId: string;
  eleccionCargoId: string;
  rolEspecifico?: string;
}

/**
 * Valida que el frente y la papeleta pertenezcan al mismo proceso electoral.
 */
export function validarCoherenciaFrentePapeleta(frente: Frente, eleccionCargo: EleccionCargo): void {
  const eleccionFrenteId = frente.eleccion?.id;
  const eleccionPapeletaId = eleccionCargo.eleccion?.id;

  if (!eleccionFrenteId || !eleccionPapeletaId) {
    throw new BadRequestException('No se pudo verificar la elección del frente o la papeleta.');
  }

  if (eleccionFrenteId !== eleccionPapeletaId) {
    throw new BadRequestException(
      'El frente y la papeleta deben pertenecer al mismo proceso electoral.',
    );
  }
}

function validarRolEspecificoParaPapeleta(eleccionCargo: EleccionCargo, rolEspecifico: string): void {
  if (!rolEspecifico?.trim()) {
    throw new BadRequestException('Debe indicar el rol específico del candidato dentro de la fórmula.');
  }

  if (!esRolValidoParaAlcance(eleccionCargo.alcance, rolEspecifico.trim())) {
    throw new BadRequestException(
      `El rol "${rolEspecifico}" no es válido para una papeleta de alcance ${eleccionCargo.alcance}.`,
    );
  }
}

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
    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,
  ) {}

  async crearCandidato(crearCandidatoDto: CrearCandidatoDto): Promise<ApiResponse<Candidato>> {
    const { frente, eleccionCargo } = await this.resolverFrenteYPapeleta(
      crearCandidatoDto.frenteId,
      crearCandidatoDto.eleccionCargoId,
    );

    validarCoherenciaFrentePapeleta(frente, eleccionCargo);
    validarRolEspecificoParaPapeleta(eleccionCargo, crearCandidatoDto.rolEspecifico);

    const candidato = this.candidatoRepository.create({
      ci: crearCandidatoDto.ci,
      nombres: crearCandidatoDto.nombres,
      apellidos: crearCandidatoDto.apellidos,
      fotoUrl: crearCandidatoDto.fotoUrl ?? null,
      rolEspecifico: crearCandidatoDto.rolEspecifico.trim(),
      frente,
      eleccionCargo,
    });

    const guardado = await this.candidatoRepository.save(candidato);
    return createApiResponse(HttpStatus.CREATED, guardado, 'Candidato creado correctamente.');
  }

  /**
   * Crea un candidato dentro de una transacción existente (usado por FrenteService).
   */
  async crearCandidatoEnTransaccion(
    manager: EntityManager,
    datos: DatosCandidatoTransaccion,
  ): Promise<Candidato> {
    const frenteRepo = manager.getRepository(Frente);
    const eleccionCargoRepo = manager.getRepository(EleccionCargo);
    const candidatoRepo = manager.getRepository(Candidato);

    const frente = await frenteRepo.findOne({
      where: { id: datos.frenteId },
      relations: { eleccion: true },
    });
    if (!frente) {
      throw new NotFoundException(`No se encontró el frente con id ${datos.frenteId}`);
    }

    const eleccionCargo = await eleccionCargoRepo.findOne({
      where: { id: datos.eleccionCargoId },
      relations: { eleccion: true },
    });
    if (!eleccionCargo) {
      throw new NotFoundException(`No se encontró la papeleta con id ${datos.eleccionCargoId}`);
    }

    validarCoherenciaFrentePapeleta(frente, eleccionCargo);
    if (datos.rolEspecifico) {
      validarRolEspecificoParaPapeleta(eleccionCargo, datos.rolEspecifico);
    }

    const candidato = candidatoRepo.create({
      ci: datos.ci,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      fotoUrl: datos.fotoUrl ?? null,
      rolEspecifico: datos.rolEspecifico?.trim() ?? null,
      frente,
      eleccionCargo,
    });

    return candidatoRepo.save(candidato);
  }

  async listarCandidatos(eleccionId?: string): Promise<ApiResponse<Candidato[]>> {
    const candidatos = await this.candidatoRepository.find({
      where: eleccionId ? { eleccionCargo: { eleccion: { id: eleccionId } } } : {},
      relations: {
        frente: { eleccion: true },
        eleccionCargo: { cargo: true, eleccion: true },
      },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, candidatos, 'Candidatos listados correctamente.');
  }

  async obtenerCandidatoPorId(candidatoId: string): Promise<ApiResponse<Candidato>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);
    return createApiResponse(HttpStatus.OK, candidato, 'Candidato obtenido correctamente.');
  }

  async actualizarCandidato(
    candidatoId: string,
    actualizarCandidatoDto: ActualizarCandidatoDto,
  ): Promise<ApiResponse<Candidato>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);

    const frenteId = actualizarCandidatoDto.frenteId ?? candidato.frente.id;
    const eleccionCargoId =
      actualizarCandidatoDto.eleccionCargoId ?? candidato.eleccionCargo.id;

    const { frente, eleccionCargo } = await this.resolverFrenteYPapeleta(frenteId, eleccionCargoId);
    validarCoherenciaFrentePapeleta(frente, eleccionCargo);

    const rolEspecifico =
      actualizarCandidatoDto.rolEspecifico ?? candidato.rolEspecifico ?? '';
    validarRolEspecificoParaPapeleta(eleccionCargo, rolEspecifico);

    candidato.frente = frente;
    candidato.eleccionCargo = eleccionCargo;
    candidato.ci = actualizarCandidatoDto.ci ?? candidato.ci;
    candidato.nombres = actualizarCandidatoDto.nombres ?? candidato.nombres;
    candidato.apellidos = actualizarCandidatoDto.apellidos ?? candidato.apellidos;
    candidato.fotoUrl = actualizarCandidatoDto.fotoUrl ?? candidato.fotoUrl;
    candidato.rolEspecifico = rolEspecifico.trim();

    const actualizado = await this.candidatoRepository.save(candidato);
    return createApiResponse(HttpStatus.OK, actualizado, 'Candidato actualizado correctamente.');
  }

  async eliminarCandidato(candidatoId: string): Promise<ApiResponse<null>> {
    const candidato = await this.buscarCandidatoPorIdOrThrow(candidatoId);
    await this.candidatoRepository.remove(candidato);
    return createApiResponse(HttpStatus.OK, null, 'Candidato eliminado correctamente.');
  }

  private async resolverFrenteYPapeleta(
    frenteId: string,
    eleccionCargoId: string,
  ): Promise<{ frente: Frente; eleccionCargo: EleccionCargo }> {
    const frente = await this.frenteRepository.findOne({
      where: { id: frenteId },
      relations: { eleccion: true },
    });
    if (!frente) {
      throw new NotFoundException(`No se encontro el frente con id ${frenteId}`);
    }

    const eleccionCargo = await this.eleccionCargoRepository.findOne({
      where: { id: eleccionCargoId },
      relations: { eleccion: true },
    });
    if (!eleccionCargo) {
      throw new NotFoundException(`No se encontro la papeleta con id ${eleccionCargoId}`);
    }

    return { frente, eleccionCargo };
  }

  private async buscarCandidatoPorIdOrThrow(candidatoId: string): Promise<Candidato> {
    const candidato = await this.candidatoRepository.findOne({
      where: { id: candidatoId },
      relations: {
        frente: { eleccion: true },
        eleccionCargo: { cargo: true, eleccion: true },
      },
    });

    if (!candidato) {
      throw new NotFoundException(`No se encontro el candidato con id ${candidatoId}`);
    }

    return candidato;
  }
}
