import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Eleccion } from '../entities/eleccion.entity';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { RegistroSufragio } from '../entities/registro-sufragio.entity';
import { EstamentoEnum } from '../../electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';

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
  porcentajeParticipacion: number;
  porEstamento: {
    estudiante: EstadisticasEstamento;
    docente: EstadisticasEstamento;
    administrativo: EstadisticasEstamento;
  };
  ultimaActualizacion: string;
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

  /**
   * Obtiene el conteo de votos emitidos agrupado por estamento para una elección.
   * Retorna un mapa: EstamentoEnum → número de votos.
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
    // Habilitados por carrera
    const habRows: { carrera: string; total: string }[] = await this.padronRepository
      .createQueryBuilder('padron')
      .innerJoin('padron.elector', 'elector')
      .where('padron.eleccion = :eleccionId', { eleccionId })
      .andWhere('padron.estaHabilitado = :hab', { hab: true })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('elector.carrera', 'carrera')
      .addSelect('COUNT(padron.id)', 'total')
      .groupBy('elector.carrera')
      .orderBy('elector.carrera', 'ASC')
      .getRawMany();

    // Votos por carrera
    const votosRows: { carrera: string; total: string }[] = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .innerJoin('rs.elector', 'elector')
      .where('rs.eleccion = :eleccionId', { eleccionId })
      .andWhere('elector.estamento = :estamento', { estamento })
      .select('elector.carrera', 'carrera')
      .addSelect('COUNT(rs.id)', 'total')
      .groupBy('elector.carrera')
      .getRawMany();

    const votosMap = new Map<string, number>();
    for (const row of votosRows) {
      votosMap.set(row.carrera, parseInt(row.total, 10));
    }

    return habRows.map((row) => {
      const habilitados = parseInt(row.total, 10);
      const votos = votosMap.get(row.carrera) ?? 0;
      return {
        carrera: row.carrera,
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

    const [habPorEstamento, votosPorEstamento] = await Promise.all([
      this.obtenerHabilitadosPorEstamento(eleccionId),
      this.obtenerVotosPorEstamento(eleccionId),
    ]);

    // Totales globales
    let totalHabilitados = 0;
    let totalVotos = 0;
    for (const v of habPorEstamento.values()) totalHabilitados += v;
    for (const v of votosPorEstamento.values()) totalVotos += v;

    // Función auxiliar para construir el objeto por estamento
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
      porcentajeParticipacion: this.calcularPorcentaje(totalVotos, totalHabilitados),
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
