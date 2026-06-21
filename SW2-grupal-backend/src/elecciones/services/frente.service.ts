import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { CrearFrenteDto } from 'src/elecciones/dto/frente/crear-frente.dto';
import { ActualizarFrenteDto } from 'src/elecciones/dto/frente/actualizar-frente.dto';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { CandidatoService } from './candidato.service';
import { EleccionEstadoService } from './eleccion-estado.service';

/**
 * Servicio de aplicacion para la gestión de Frentes y Planillas de Candidatos.
 */
@Injectable()
export class FrenteService {
  constructor(
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,
    private readonly dataSource: DataSource,
    private readonly candidatoService: CandidatoService,
    private readonly eleccionEstadoService: EleccionEstadoService,
  ) {}

  /**
   * Registra un frente en un proceso electoral (modelo nuevo).
   */
  async registrarFrentePorEleccion(
    eleccionId: string,
    crearFrenteDto: CrearFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    await this.eleccionEstadoService.assertEnConfiguracion(eleccionId);
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const frente = manager.create(Frente, {
        nombreFrente: crearFrenteDto.nombreFrente,
        sigla: crearFrenteDto.sigla,
        logoUrl: crearFrenteDto.logoUrl ?? null,
        esOpcionGlobal: crearFrenteDto.esOpcionGlobal ?? false,
        eleccion,
        eleccionCargo: null,
      });

      const frenteGuardado = await manager.save(frente);

      if (crearFrenteDto.candidatos?.length) {
        for (const cand of crearFrenteDto.candidatos) {
          if (!cand.eleccionCargoId) {
            throw new BadRequestException(
              'Cada candidato anidado debe incluir eleccionCargoId al registrar un frente por elección.',
            );
          }
          await this.candidatoService.crearCandidatoEnTransaccion(manager, {
            ci: cand.ci,
            nombres: cand.nombres,
            apellidos: cand.apellidos,
            fotoUrl: cand.fotoUrl,
            frenteId: frenteGuardado.id,
            eleccionCargoId: cand.eleccionCargoId,
          });
        }
      }

      return frenteGuardado;
    });

    const frenteConRelaciones = await this.frenteRepository.findOne({
      where: { id: resultado.id },
      relations: { eleccion: true, candidatos: { eleccionCargo: { cargo: true } } },
    });

    return createApiResponse(HttpStatus.CREATED, frenteConRelaciones, 'Frente registrado correctamente.');
  }

  /**
   * @deprecated Legacy — registrar frente vinculado a una papeleta concreta.
   * Deriva eleccionId desde la papeleta para compatibilidad con clientes antiguos.
   */
  async registrarFrente(eleccionCargoId: string, crearFrenteDto: CrearFrenteDto): Promise<ApiResponse<Frente>> {
    const eleccionCargo = await this.buscarEleccionCargoPorIdOrThrow(eleccionCargoId, true);
    await this.eleccionEstadoService.assertEnConfiguracion(eleccionCargo.eleccion.id);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const frente = manager.create(Frente, {
        nombreFrente: crearFrenteDto.nombreFrente,
        sigla: crearFrenteDto.sigla,
        logoUrl: crearFrenteDto.logoUrl ?? null,
        esOpcionGlobal: crearFrenteDto.esOpcionGlobal ?? false,
        eleccion: eleccionCargo.eleccion,
        eleccionCargo,
      });

      const frenteGuardado = await manager.save(frente);

      if (crearFrenteDto.candidatos?.length) {
        for (const cand of crearFrenteDto.candidatos) {
          await this.candidatoService.crearCandidatoEnTransaccion(manager, {
            ci: cand.ci,
            nombres: cand.nombres,
            apellidos: cand.apellidos,
            fotoUrl: cand.fotoUrl,
            frenteId: frenteGuardado.id,
            eleccionCargoId: cand.eleccionCargoId ?? eleccionCargoId,
          });
        }
      }

      return frenteGuardado;
    });

    const frenteConCandidatos = await this.frenteRepository.findOne({
      where: { id: resultado.id },
      relations: { eleccion: true, candidatos: { eleccionCargo: { cargo: true } } },
    });

    return createApiResponse(HttpStatus.CREATED, frenteConCandidatos, 'Frente registrado correctamente.');
  }

  /**
   * Lista frentes de un proceso electoral.
   */
  async listarFrentesPorEleccion(eleccionId: string): Promise<ApiResponse<Frente[]>> {
    await this.buscarEleccionPorIdOrThrow(eleccionId);

    const frentes = await this.frenteRepository.find({
      where: { eleccion: { id: eleccionId } },
      relations: { eleccion: true, candidatos: { eleccionCargo: { cargo: true } } },
      order: { nombreFrente: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, frentes, 'Frentes listados correctamente.');
  }

  /**
   * @deprecated Legacy — frentes que aún tienen eleccionCargoId apuntando a una papeleta.
   */
  async listarFrentesPorEleccionCargo(eleccionCargoId: string): Promise<ApiResponse<Frente[]>> {
    const eleccionCargo = await this.buscarEleccionCargoPorIdOrThrow(eleccionCargoId, true);

    const frentes = await this.frenteRepository.find({
      where: { eleccion: { id: eleccionCargo.eleccion.id } },
      relations: { eleccion: true, candidatos: { eleccionCargo: { cargo: true } } },
      order: { nombreFrente: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, frentes, 'Frentes listados correctamente.');
  }

  /**
   * Lista todos los frentes globalmente (panel de administración).
   */
  async listarFrentes(eleccionId?: string): Promise<ApiResponse<any[]>> {
    const where = eleccionId ? { eleccion: { id: eleccionId } } : {};

    const frentes = await this.frenteRepository.find({
      where,
      relations: {
        eleccion: true,
        candidatos: { eleccionCargo: { cargo: true, eleccion: true } },
      },
      order: { nombreFrente: 'ASC' },
    });

    const result = frentes.map((frente) => ({
      id: frente.id,
      nombreFrente: frente.nombreFrente,
      sigla: frente.sigla,
      logoUrl: frente.logoUrl,
      esOpcionGlobal: frente.esOpcionGlobal,
      eleccion: frente.eleccion,
      eleccionId: frente.eleccion?.id ?? null,
      candidatos: frente.candidatos ?? [],
    }));

    return createApiResponse(HttpStatus.OK, result, 'Frentes listados correctamente.');
  }

  async obtenerFrentePorId(frenteId: string): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    return createApiResponse(HttpStatus.OK, frente, 'Frente obtenido correctamente.');
  }

  async actualizarFrente(
    frenteId: string,
    actualizarFrenteDto: ActualizarFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    await this.eleccionEstadoService.assertEnConfiguracion(frente.eleccion.id);

    frente.nombreFrente = actualizarFrenteDto.nombreFrente ?? frente.nombreFrente;
    frente.sigla = actualizarFrenteDto.sigla ?? frente.sigla;
    frente.logoUrl = actualizarFrenteDto.logoUrl ?? frente.logoUrl;
    frente.esOpcionGlobal = actualizarFrenteDto.esOpcionGlobal ?? frente.esOpcionGlobal;

    const actualizado = await this.frenteRepository.save(frente);
    return createApiResponse(HttpStatus.OK, actualizado, 'Frente actualizado correctamente.');
  }

  async eliminarFrente(frenteId: string): Promise<ApiResponse<null>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    await this.eleccionEstadoService.assertEnConfiguracion(frente.eleccion.id);
    await this.frenteRepository.remove(frente);
    return createApiResponse(HttpStatus.OK, null, 'Frente eliminado correctamente.');
  }

  private async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}`);
    }
    return eleccion;
  }

  private async buscarEleccionCargoPorIdOrThrow(
    eleccionCargoId: string,
    loadEleccion = false,
  ): Promise<EleccionCargo> {
    const ec = await this.eleccionCargoRepository.findOne({
      where: { id: eleccionCargoId },
      relations: loadEleccion ? { eleccion: true } : undefined,
    });

    if (!ec) {
      throw new NotFoundException(`No se encontró la papeleta con id ${eleccionCargoId}`);
    }

    return ec;
  }

  private async buscarFrentePorIdOrThrow(frenteId: string): Promise<Frente> {
    const frente = await this.frenteRepository.findOne({
      where: { id: frenteId },
      relations: {
        eleccion: true,
        candidatos: { eleccionCargo: { cargo: true } },
      },
    });

    if (!frente) {
      throw new NotFoundException(`No se encontró el frente con id ${frenteId}`);
    }

    return frente;
  }
}
