import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Eleccion } from '../entities/eleccion.entity';
import { EleccionCargo } from '../entities/eleccion-cargo.entity';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { RegistroSufragio } from '../entities/registro-sufragio.entity';
import { EstamentoEnum } from '../../electores/entities/elector.entity';
import { AlcancePapeletaEnum } from '../enums/alcance-papeleta.enum';
import { EstadoEleccionEnum } from '../enums/estado-eleccion.enum';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';

// ─── Interfaces de resultado ──────────────────────────────────────────────────

/** Estadísticas de un estamento concreto (docente / estudiante). */
export interface EstadisticasEstamento {
  habilitados: number;
  votos: number;
  porcentaje: number;
}

/** Respuesta completa de CU-15: participación global con desglose por estamento. */
export interface EstadisticasParticipacion {
  eleccionId: string;
  tituloEleccion: string;
  totalHabilitados: number;
  totalVotosEmitidos: number;
  totalElectoresParticipantes: number;
  porcentajeParticipacion: number;
  porEstamento: {
    estudiante: EstadisticasEstamento;
    docente: EstadisticasEstamento;
    administrativo: EstadisticasEstamento;
  };
  ultimaActualizacion: string;
}

/** Serie simple para gráficos de participación por papeleta. */
export interface EstadisticasSerie {
  name: string;
  value: number;
}

/** Estadísticas de una papeleta (EleccionCargo) dentro del dashboard jerárquico. */
export interface EstadisticasPapeleta {
  eleccionCargoId: string;
  cargoNombre: string;
  alcance: AlcancePapeletaEnum;
  orden: number;
  ambito: {
    codFacultad: string | null;
    facultadNombre: string | null;
    codCarrera: string | null;
    carreraNombre: string | null;
  };
  habilitados: number;
  votosEmitidos: number;
  pendientes: number;
  porcentajeParticipacion: number;
  porEstamento: {
    estudiante: EstadisticasEstamento;
    docente: EstadisticasEstamento;
    administrativo: EstadisticasEstamento;
  };
  series: EstadisticasSerie[];
}

/** Respuesta jerárquica agrupada por papeleta/alcance. */
export interface EstadisticasJerarquicas {
  eleccionId: string;
  tituloEleccion: string;
  estado: EstadoEleccionEnum;
  ultimaActualizacion: string;
  resumenGeneral: {
    totalHabilitados: number;
    totalSufragiosEmitidos: number;
    totalElectoresParticipantes: number;
    porcentajeParticipacion: number;
  };
  papeletas: EstadisticasPapeleta[];
}

/** Respuesta de CU-16/CU-17: estadísticas filtradas por un estamento específico. */
export interface EstadisticasEstamentoDetalle {
  eleccionId: string;
  tituloEleccion: string;
  estamento: string;
  totalHabilitados: number;
  totalVotosEmitidos: number;
  porcentajeParticipacion: number;
  desglosePorCarrera: { carrera: string; habilitados: number; votos: number; porcentaje: number }[];
  ultimaActualizacion: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * Servicio de Estadísticas Electorales — CU-15, CU-16, CU-17.
 *
 * Provee métodos para consultar la participación en tiempo real
 * global y filtrada por estamento (docente / estudiante / administrativo).
 * Toda la lógica usa QueryBuilder para eficiencia máxima (una sola
 * consulta con GROUP BY en lugar de cargar entidades completas).
 *
 * Repositorios inyectados: Eleccion, PadronElectoral, RegistroSufragio.
 */
@Injectable()
export class EstadisticasService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(PadronElectoral)
    private readonly padronRepository: Repository<PadronElectoral>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    private readonly papeletaEligibilityService: PapeletaEligibilityService,
  ) {}

  // ─── Utilidades privadas ──────────────────────────────────────────────────────

  /**
   * Busca una elección por ID y lanza NotFoundException si no existe.
   */
  private async findEleccionOrFail(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
    });
    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con ID "${eleccionId}".`,
      );
    }
    return eleccion;
  }

  private async findEleccionConCargosOrFail(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
      relations: { eleccionCargos: { cargo: true } },
    });
    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con ID "${eleccionId}".`,
      );
    }
    return eleccion;
  }

  private crearEstamentoVacio(): EstadisticasEstamento {
    return { habilitados: 0, votos: 0, porcentaje: 0 };
  }

  private buildEstamentoStats(
    habMap: Map<string, number>,
    votosMap: Map<string, number>,
    key: EstamentoEnum,
  ): EstadisticasEstamento {
    const habilitados = habMap.get(key) ?? 0;
    const votos = votosMap.get(key) ?? 0;
    return {
      habilitados,
      votos,
      porcentaje: this.calcularPorcentaje(votos, habilitados),
    };
  }

  private compararPapeletas(a: EleccionCargo, b: EleccionCargo): number {
    const ordenAlcance: Record<AlcancePapeletaEnum, number> = {
      [AlcancePapeletaEnum.GLOBAL]: 0,
      [AlcancePapeletaEnum.FACULTAD]: 1,
      [AlcancePapeletaEnum.CARRERA]: 2,
    };

    const alcanceDiff = ordenAlcance[a.alcance] - ordenAlcance[b.alcance];
    if (alcanceDiff !== 0) return alcanceDiff;

    if (a.orden !== b.orden) return a.orden - b.orden;

    const facDiff = String(a.facultadNombre ?? '').localeCompare(String(b.facultadNombre ?? ''));
    if (facDiff !== 0) return facDiff;

    return String(a.carreraNombre ?? '').localeCompare(String(b.carreraNombre ?? ''));
  }

  private async obtenerVotosPorPapeletaYEstamento(
    eleccionId: string,
  ): Promise<Map<string, Map<string, number>>> {
    const rows: { eleccionCargoId: string; estamento: string; total: string }[] =
      await this.registroSufragioRepository
        .createQueryBuilder('rs')
        .innerJoin('rs.elector', 'elector')
        .innerJoin('rs.eleccionCargo', 'ec')
        .where('rs.eleccion = :eleccionId', { eleccionId })
        .select('ec.id', 'eleccionCargoId')
        .addSelect('elector.estamento', 'estamento')
        .addSelect('COUNT(rs.id)', 'total')
        .groupBy('ec.id')
        .addGroupBy('elector.estamento')
        .getRawMany();

    const mapa = new Map<string, Map<string, number>>();
    for (const row of rows) {
      if (!mapa.has(row.eleccionCargoId)) {
        mapa.set(row.eleccionCargoId, new Map<string, number>());
      }
      mapa.get(row.eleccionCargoId)!.set(row.estamento, parseInt(row.total, 10));
    }
    return mapa;
  }

  private calcularHabilitadosPorPapeleta(
    eleccionCargo: EleccionCargo,
    padronHabilitado: PadronElectoral[],
  ): Map<string, number> {
    const mapa = new Map<string, number>();

    for (const entrada of padronHabilitado) {
      const elector = entrada.elector;
      if (!elector) continue;

      if (
        !this.papeletaEligibilityService.esPapeletaAplicable(
          elector,
          eleccionCargo,
          entrada,
        )
      ) {
        continue;
      }

      const estamento = elector.estamento;
      mapa.set(estamento, (mapa.get(estamento) ?? 0) + 1);
    }

    return mapa;
  }

  /**
   * Calcula el porcentaje de participación redondeado a 2 decimales.
   * Retorna 0 si no hay habilitados para evitar divisiones por cero.
   */
  private calcularPorcentaje(votos: number, habilitados: number): number {
    if (habilitados === 0) return 0;
    return Math.round((votos / habilitados) * 10000) / 100;
  }

  /**
   * Obtiene el conteo de habilitados agrupado por estamento para una elección.
   * Retorna un mapa: EstamentoEnum → número de habilitados.
   */
  private async obtenerHabilitadosPorEstamento(
    eleccionId: string,
  ): Promise<Map<string, number>> {
    const rows: { estamento: string; total: string }[] = await this.padronRepository
      .createQueryBuilder('padron')
      .innerJoin('padron.elector', 'elector')
      .where('padron.eleccion = :eleccionId', { eleccionId })
      .andWhere('padron.estaHabilitado = :hab', { hab: true })
      .select('elector.estamento', 'estamento')
      .addSelect('COUNT(padron.id)', 'total')
      .groupBy('elector.estamento')
      .getRawMany();

    const mapa = new Map<string, number>();
    for (const row of rows) {
      mapa.set(row.estamento, parseInt(row.total, 10));
    }
    return mapa;
  }

  private async contarElectoresParticipantes(eleccionId: string): Promise<number> {
    const row = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .where('rs.eleccion = :eleccionId', { eleccionId })
      .select('COUNT(DISTINCT rs.elector)', 'total')
      .getRawOne<{ total: string }>();

    return parseInt(row?.total ?? '0', 10);
  }

  /**
   * Obtiene el conteo de votos emitidos agrupado por estamento para una elección.
   */
  private async obtenerVotosPorEstamento(
    eleccionId: string,
  ): Promise<Map<string, number>> {
    const rows: { estamento: string; total: string }[] = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .innerJoin('rs.elector', 'elector')
      .where('rs.eleccion = :eleccionId', { eleccionId })
      .select('elector.estamento', 'estamento')
      .addSelect('COUNT(rs.id)', 'total')
      .groupBy('elector.estamento')
      .getRawMany();

    const mapa = new Map<string, number>();
    for (const row of rows) {
      mapa.set(row.estamento, parseInt(row.total, 10));
    }
    return mapa;
  }

  /**
   * Obtiene habilitados y votos agrupados por carrera para un estamento dado.
   */
  private async obtenerDesglosePorCarrera(
    eleccionId: string,
    estamento: EstamentoEnum,
  ): Promise<{ carrera: string; habilitados: number; votos: number; porcentaje: number }[]> {
    // Habilitados por carrera — normalizar con LOWER(TRIM()) para fusionar variantes
    const habRows: { carrera: string; carrera_norm: string; total: string }[] = await this.padronRepository
      .createQueryBuilder('padron')
      .innerJoin('padron.elector', 'elector')
      .where('padron.eleccion = :eleccionId', { eleccionId })
      .andWhere('padron.estaHabilitado = :hab', { hab: true })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('MIN(elector.carrera)', 'carrera')               // nombre display (el primero encontrado)
      .addSelect('LOWER(TRIM(elector.carrera))', 'carrera_norm') // clave de agrupación normalizada
      .addSelect('COUNT(padron.id)', 'total')
      .groupBy('LOWER(TRIM(elector.carrera))')
      .orderBy('LOWER(TRIM(elector.carrera))', 'ASC')
      .getRawMany();

    // Votos por carrera — misma normalización
    const votosRows: { carrera_norm: string; total: string }[] = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .innerJoin('rs.elector', 'elector')
      .where('rs.eleccion = :eleccionId', { eleccionId })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('LOWER(TRIM(elector.carrera))', 'carrera_norm')
      .addSelect('COUNT(rs.id)', 'total')
      .groupBy('LOWER(TRIM(elector.carrera))')
      .getRawMany();

    const votosMap = new Map<string, number>();
    for (const row of votosRows) {
      votosMap.set(row.carrera_norm, parseInt(row.total, 10));
    }

    return habRows.map((row) => {
      const habilitados = parseInt(row.total, 10);
      const votos = votosMap.get(row.carrera_norm) ?? 0;
      return {
        carrera: row.carrera,   // nombre legible para mostrar en UI
        habilitados,
        votos,
        porcentaje: this.calcularPorcentaje(votos, habilitados),
      };
    });
  }

  // ─── Métodos públicos (casos de uso) ─────────────────────────────────────────

  /**
   * CU-15: Monitoreo de participación en tiempo real.
   *
   * Devuelve el estado actual de participación de toda la elección,
   * con desglose por estamento (docente / estudiante / administrativo).
   *
   * @param eleccionId UUID de la elección.
   * @returns ApiResponse con EstadisticasParticipacion.
   */
  async obtenerParticipacionGlobal(
    eleccionId: string,
  ): Promise<ApiResponse<EstadisticasParticipacion>> {
    const eleccion = await this.findEleccionOrFail(eleccionId);

    const [habPorEstamento, votosPorEstamento, totalElectoresParticipantes] = await Promise.all([
      this.obtenerHabilitadosPorEstamento(eleccionId),
      this.obtenerVotosPorEstamento(eleccionId),
      this.contarElectoresParticipantes(eleccionId),
    ]);

    // Totales globales
    let totalHabilitados = 0;
    let totalVotos = 0;
    for (const v of habPorEstamento.values()) totalHabilitados += v;
    for (const v of votosPorEstamento.values()) totalVotos += v;

    const buildEstamento = (key: EstamentoEnum): EstadisticasEstamento => {
      const hab = habPorEstamento.get(key) ?? 0;
      const votos = votosPorEstamento.get(key) ?? 0;
      return { habilitados: hab, votos, porcentaje: this.calcularPorcentaje(votos, hab) };
    };

    const data: EstadisticasParticipacion = {
      eleccionId,
      tituloEleccion: eleccion.titulo,
      totalHabilitados,
      totalVotosEmitidos: totalVotos,
      totalElectoresParticipantes,
      porcentajeParticipacion: this.calcularPorcentaje(totalElectoresParticipantes, totalHabilitados),
      porEstamento: {
        estudiante: buildEstamento(EstamentoEnum.ESTUDIANTE),
        docente: buildEstamento(EstamentoEnum.DOCENTE),
        administrativo: buildEstamento(EstamentoEnum.ADMINISTRATIVO),
      },
      ultimaActualizacion: new Date().toISOString(),
    };

    return createApiResponse(
      HttpStatus.OK,
      data,
      'Estadísticas de participación obtenidas correctamente.',
    );
  }

  /**
   * CU-16: Estadísticas detalladas de estudiantes con desglose por carrera.
   *
   * @param eleccionId UUID de la elección.
   * @returns ApiResponse con EstadisticasEstamentoDetalle para ESTUDIANTE.
   */
  async obtenerEstadisticasEstudiantes(
    eleccionId: string,
  ): Promise<ApiResponse<EstadisticasEstamentoDetalle>> {
    return this.obtenerEstadisticasPorEstamento(eleccionId, EstamentoEnum.ESTUDIANTE);
  }

  /**
   * CU-17: Estadísticas detalladas de docentes con desglose por carrera/departamento.
   *
   * @param eleccionId UUID de la elección.
   * @returns ApiResponse con EstadisticasEstamentoDetalle para DOCENTE.
   */
  async obtenerEstadisticasDocentes(
    eleccionId: string,
  ): Promise<ApiResponse<EstadisticasEstamentoDetalle>> {
    return this.obtenerEstadisticasPorEstamento(eleccionId, EstamentoEnum.DOCENTE);
  }

  /**
   * Estadísticas jerárquicas agrupadas por papeleta (EleccionCargo).
   * Incluye contadores en cero cuando la elección está sellada sin votos.
   */
  async obtenerEstadisticasJerarquicas(
    eleccionId: string,
  ): Promise<ApiResponse<EstadisticasJerarquicas>> {
    const eleccion = await this.findEleccionConCargosOrFail(eleccionId);

    const cargosOrdenados = [...(eleccion.eleccionCargos ?? [])].sort((a, b) =>
      this.compararPapeletas(a, b),
    );

    const [padronHabilitado, votosPorPapeleta, totalElectoresParticipantes, totalSufragios] =
      await Promise.all([
        this.padronRepository.find({
          where: { eleccion: { id: eleccionId }, estaHabilitado: true },
          relations: { elector: true },
        }),
        this.obtenerVotosPorPapeletaYEstamento(eleccionId),
        this.contarElectoresParticipantes(eleccionId),
        this.registroSufragioRepository.count({
          where: { eleccion: { id: eleccionId } },
        }),
      ]);

    const papeletas: EstadisticasPapeleta[] = cargosOrdenados.map((cargo) => {
      const habPorEstamento = this.calcularHabilitadosPorPapeleta(cargo, padronHabilitado);
      const votosMap = votosPorPapeleta.get(cargo.id) ?? new Map<string, number>();

      let habilitados = 0;
      let votosEmitidos = 0;
      for (const v of habPorEstamento.values()) habilitados += v;
      for (const v of votosMap.values()) votosEmitidos += v;

      const pendientes = Math.max(habilitados - votosEmitidos, 0);

      return {
        eleccionCargoId: cargo.id,
        cargoNombre: cargo.cargo?.nombre ?? 'Papeleta',
        alcance: cargo.alcance,
        orden: cargo.orden,
        ambito: {
          codFacultad: cargo.codFacultad,
          facultadNombre: cargo.facultadNombre,
          codCarrera: cargo.codCarrera,
          carreraNombre: cargo.carreraNombre,
        },
        habilitados,
        votosEmitidos,
        pendientes,
        porcentajeParticipacion: this.calcularPorcentaje(votosEmitidos, habilitados),
        porEstamento: {
          estudiante: this.buildEstamentoStats(habPorEstamento, votosMap, EstamentoEnum.ESTUDIANTE),
          docente: this.buildEstamentoStats(habPorEstamento, votosMap, EstamentoEnum.DOCENTE),
          administrativo: this.buildEstamentoStats(
            habPorEstamento,
            votosMap,
            EstamentoEnum.ADMINISTRATIVO,
          ),
        },
        series: [
          { name: 'Habilitados', value: habilitados },
          { name: 'Votos emitidos', value: votosEmitidos },
          { name: 'Pendientes', value: pendientes },
        ],
      };
    });

    const totalHabilitadosPadron = padronHabilitado.length;
    const estado = eleccion.estado ?? EstadoEleccionEnum.EN_CONFIGURACION;

    const data: EstadisticasJerarquicas = {
      eleccionId,
      tituloEleccion: eleccion.titulo,
      estado,
      ultimaActualizacion: new Date().toISOString(),
      resumenGeneral: {
        totalHabilitados: totalHabilitadosPadron,
        totalSufragiosEmitidos: totalSufragios,
        totalElectoresParticipantes,
        porcentajeParticipacion: this.calcularPorcentaje(
          totalElectoresParticipantes,
          totalHabilitadosPadron,
        ),
      },
      papeletas,
    };

    return createApiResponse(
      HttpStatus.OK,
      data,
      'Estadísticas jerárquicas obtenidas correctamente.',
    );
  }

  /**
   * Método interno reutilizable para CU-16 y CU-17.
   * Filtra todas las estadísticas a un estamento específico.
   */
  private async obtenerEstadisticasPorEstamento(
    eleccionId: string,
    estamento: EstamentoEnum,
  ): Promise<ApiResponse<EstadisticasEstamentoDetalle>> {
    const eleccion = await this.findEleccionOrFail(eleccionId);

    // Totales del estamento
    const habilitadosRows: { total: string }[] = await this.padronRepository
      .createQueryBuilder('padron')
      .innerJoin('padron.elector', 'elector')
      .where('padron.eleccion = :eleccionId', { eleccionId })
      .andWhere('padron.estaHabilitado = :hab', { hab: true })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('COUNT(padron.id)', 'total')
      .getRawMany();

    const votosRows: { total: string }[] = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .innerJoin('rs.elector', 'elector')
      .where('rs.eleccion = :eleccionId', { eleccionId })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('COUNT(rs.id)', 'total')
      .getRawMany();

    const totalHabilitados = parseInt(habilitadosRows[0]?.total ?? '0', 10);
    const totalVotos = parseInt(votosRows[0]?.total ?? '0', 10);

    const desglosePorCarrera = await this.obtenerDesglosePorCarrera(eleccionId, estamento);

    const data: EstadisticasEstamentoDetalle = {
      eleccionId,
      tituloEleccion: eleccion.titulo,
      estamento,
      totalHabilitados,
      totalVotosEmitidos: totalVotos,
      porcentajeParticipacion: this.calcularPorcentaje(totalVotos, totalHabilitados),
      desglosePorCarrera,
      ultimaActualizacion: new Date().toISOString(),
    };

    const mensajes: Record<EstamentoEnum, string> = {
      [EstamentoEnum.ESTUDIANTE]: 'Estadísticas estudiantiles obtenidas correctamente.',
      [EstamentoEnum.DOCENTE]: 'Estadísticas docentes obtenidas correctamente.',
      [EstamentoEnum.ADMINISTRATIVO]: 'Estadísticas del personal administrativo obtenidas correctamente.',
    };

    return createApiResponse(HttpStatus.OK, data, mensajes[estamento]);
  }
}
