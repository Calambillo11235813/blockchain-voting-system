import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { CrearFrenteDto } from 'src/elecciones/dto/frente/crear-frente.dto';
import { ActualizarFrenteDto } from 'src/elecciones/dto/frente/actualizar-frente.dto';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { Candidato } from 'src/elecciones/entities/candidato.entity';

/**
 * Servicio de aplicacion para la gestión de Frentes y Planillas de Candidatos.
 */
@Injectable()
export class FrenteService {
  constructor(
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,
    @InjectRepository(Candidato)
    private readonly candidatoRepository: Repository<Candidato>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra un frente para competir por un cargo en una elección.
   * Si incluye candidatos, los inserta transaccionalmente.
   */
  async registrarFrente(eleccionCargoId: string, crearFrenteDto: CrearFrenteDto): Promise<ApiResponse<Frente>> {
    const eleccionCargo = await this.buscarEleccionCargoPorIdOrThrow(eleccionCargoId);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const frente = manager.create(Frente, {
        nombreFrente: crearFrenteDto.nombreFrente,
        sigla: crearFrenteDto.sigla,
        logoUrl: crearFrenteDto.logoUrl ?? null,
        esOpcionGlobal: crearFrenteDto.esOpcionGlobal ?? false,
        eleccionCargo,
      });

      const frenteGuardado = await manager.save(frente);

      if (crearFrenteDto.candidatos && crearFrenteDto.candidatos.length > 0) {
        const candidatosEntities = crearFrenteDto.candidatos.map((cand) =>
          manager.create(Candidato, {
            ci: cand.ci,
            nombres: cand.nombres,
            apellidos: cand.apellidos,
            fotoUrl: cand.fotoUrl ?? null,
            frente: frenteGuardado,
          })
        );
        await manager.save(candidatosEntities);
      }

      return frenteGuardado;
    });

    // Retornamos el frente guardado con sus relaciones completas
    const frenteConCandidatos = await this.frenteRepository.findOne({
      where: { id: resultado.id },
      relations: { candidatos: true },
    });

    return createApiResponse(HttpStatus.CREATED, frenteConCandidatos, 'Frente registrado correctamente.');
  }

  /**
   * Lista todos los frentes que compiten por un EleccionCargo específico.
   */
  async listarFrentesPorEleccionCargo(eleccionCargoId: string): Promise<ApiResponse<Frente[]>> {
    await this.buscarEleccionCargoPorIdOrThrow(eleccionCargoId);

    const frentes = await this.frenteRepository.find({
      where: { eleccionCargo: { id: eleccionCargoId } },
      relations: { candidatos: true },
      order: { nombreFrente: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, frentes, 'Frentes listados correctamente.');
  }

  /**
   * Lista todos los frentes globalmente (necesario para el panel de administración).
   * Aplana la relación `eleccionCargo` para inyectar `cargo` directamente en la respuesta.
   */
  async listarFrentes(): Promise<ApiResponse<any[]>> {
    const frentes = await this.frenteRepository.find({
      relations: { eleccionCargo: { cargo: true, eleccion: true }, candidatos: true },
      order: { nombreFrente: 'ASC' },
    });

    // Aplanar para el frontend: el frontend espera `frente.cargo` y `frente.cargo.eleccion`
    const result = frentes.map((frente) => {
      const { eleccionCargo, ...rest } = frente as any;
      return {
        ...rest,
        cargo: eleccionCargo?.cargo
          ? { ...eleccionCargo.cargo, eleccion: eleccionCargo.eleccion }
          : null,
        eleccionCargoId: eleccionCargo?.id ?? null,
      };
    });

    return createApiResponse(HttpStatus.OK, result, 'Frentes listados correctamente.');
  }

  /**
   * Obtiene un frente por ID.
   */
  async obtenerFrentePorId(frenteId: string): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    return createApiResponse(HttpStatus.OK, frente, 'Frente obtenido correctamente.');
  }

  /**
   * Actualiza un frente por ID (datos básicos).
   */
  async actualizarFrente(
    frenteId: string,
    actualizarFrenteDto: ActualizarFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);

    frente.nombreFrente = actualizarFrenteDto.nombreFrente ?? frente.nombreFrente;
    frente.sigla = actualizarFrenteDto.sigla ?? frente.sigla;
    frente.logoUrl = actualizarFrenteDto.logoUrl ?? frente.logoUrl;
    frente.esOpcionGlobal = actualizarFrenteDto.esOpcionGlobal ?? frente.esOpcionGlobal;

    const actualizado = await this.frenteRepository.save(frente);
    return createApiResponse(HttpStatus.OK, actualizado, 'Frente actualizado correctamente.');
  }

  /**
   * Elimina un frente por ID.
   */
  async eliminarFrente(frenteId: string): Promise<ApiResponse<null>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    await this.frenteRepository.remove(frente);
    return createApiResponse(HttpStatus.OK, null, 'Frente eliminado correctamente.');
  }

  private async buscarEleccionCargoPorIdOrThrow(eleccionCargoId: string): Promise<EleccionCargo> {
    const ec = await this.eleccionCargoRepository.findOne({ where: { id: eleccionCargoId } });

    if (!ec) {
      throw new NotFoundException(`No se encontró el cargo de elección con id ${eleccionCargoId}`);
    }

    return ec;
  }

  private async buscarFrentePorIdOrThrow(frenteId: string): Promise<Frente> {
    const frente = await this.frenteRepository.findOne({
      where: { id: frenteId },
      relations: { eleccionCargo: true, candidatos: true },
    });

    if (!frente) {
      throw new NotFoundException(`No se encontró el frente con id ${frenteId}`);
    }

    return frente;
  }
}
