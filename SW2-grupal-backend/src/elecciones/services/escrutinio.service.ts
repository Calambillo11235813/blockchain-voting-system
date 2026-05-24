import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { EleccionCargo } from '../entities/eleccion-cargo.entity';
import { Frente } from '../entities/frente.entity';
import { RegistroSufragio } from '../entities/registro-sufragio.entity';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { EstamentoEnum } from '../../electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { BlockchainService } from '../../blockchain/services/blockchain.service';

// ─── Interfaces de resultado ──────────────────────────────────────────────────

/** Resultado ponderado de un frente dentro del escrutinio paritario. */
export interface ResultadoFrenteParitario {
  frenteId: string;
  nombreFrente: string;
  sigla: string;
  esOpcionGlobal: boolean;
  /** Votos totales acreditados a este frente (fuente: blockchain). */
  votosBlockchain: number;
  /** % del frente sobre el total de votos emitidos. */
  porcentajeTotal: number;
  /**
   * Score paritario docente (0-100).
   * Calculado como: (votos_frente_estimados_docentes / total_docentes_habilitados) * 100.
   * Estimación proporcional al no tener desglose por estamento en blockchain.
   */
  scoreDocente: number;
  /**
   * Score paritario estudiante (0-100).
   * Calculado como: (votos_frente_estimados_estudiantes / total_estudiantes_habilitados) * 100.
   */
  scoreEstudiante: number;
  /**
   * Resultado ponderado final (ponderación paritaria 50 / 50).
   * resultado_ponderado = (scoreDocente * 0.5) + (scoreEstudiante * 0.5).
   */
  resultadoPonderado: number;
}

/** Resultado completo del escrutinio paritario de una elección. */
export interface ResultadoEscrutinioParitario {
  eleccionId: string;
  tituloEleccion: string;
  fechaEleccion: Date;
  /** Total de electores en el padrón (docentes + estudiantes). */
  totalHabilitados: number;
  totalHabilitadosDocentes: number;
  totalHabilitadosEstudiantes: number;
  /** Total de sufragios emitidos según RegistroSufragio (BD). */
  totalSufragiosEmitidos: number;
  totalSufragiosDocentes: number;
  totalSufragiosEstudiantes: number;
  /** Porcentaje de participación general. */
  participacionPorcentaje: number;
  /** Resultados por frente con ponderación paritaria. */
  resultadosPorFrente: ResultadoFrenteParitario[];
  /** Frente ganador (mayor resultado ponderado), null si no hay votos. */
  ganador: Pick<ResultadoFrenteParitario, 'frenteId' | 'nombreFrente' | 'sigla' | 'resultadoPonderado'> | null;
  /** Indica si los votos por frente provienen de la blockchain o son simulados. */
  fuenteVotos: 'blockchain' | 'simulado';
}

/** Reporte de consolidación con metadatos adicionales. */
export interface ReporteConsolidacion {
  reporte: ResultadoEscrutinioParitario;
  fechaGeneracion: string;
  firmaSimulada: string;
  version: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * Servicio dedicado al escrutinio automatizado y la generación de reportes
 * con ponderación paritaria (50 % docentes – 50 % estudiantes).
 *
 * PRINCIPIO DE DISEÑO — SECRETO DEL SUFRAGIO:
 * `RegistroSufragio` solo acredita el HECHO de haber votado (sin revelar por
 * quién). Los conteos por frente se obtienen desde la blockchain.
 * La ponderación paritaria se calcula estimando la participación por estamento
 * de forma proporcional, ya que la blockchain no segrega votos por estamento.
 */
@Injectable()
export class EscrutinioService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,

    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    private readonly blockchainService: BlockchainService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF10 — ESCRUTINIO AUTOMATIZADO CON PONDERACIÓN PARITARIA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF10 · Calcula los resultados de la elección con ponderación paritaria
   * (50 % docentes / 50 % estudiantes).
   *
   * Flujo:
   *  1. Valida existencia de la elección.
   *  2. Valida que la jornada esté cerrada (excepto en modo BYPASS).
   *  3. Obtiene totales de participación por estamento desde RegistroSufragio.
   *  4. Obtiene frentes registrados para la elección.
   *  5. Obtiene conteos de votos desde la blockchain y los mapea a frentes.
   *  6. Aplica ponderación paritaria y determina el ganador.
   *
   * @param eleccionId UUID de la elección.
   * @returns Resultado paritario completo.
   * @throws NotFoundException si la elección no existe.
   * @throws ForbiddenException si la jornada sigue abierta.
   */
  async calcularResultadosParitarios(
    eleccionId: string,
  ): Promise<ApiResponse<ResultadoEscrutinioParitario>> {
    // ── 1. Validar existencia ──────────────────────────────────────────────
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
    });

    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con id ${eleccionId}.`,
      );
    }

    // ── 2. Validar jornada cerrada ─────────────────────────────────────────
    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (!bypass && eleccion.estaActiva) {
      throw new ForbiddenException(
        'No se puede calcular resultados con la jornada abierta.',
      );
    }

    // ── 3. Participación por estamento (RegistroSufragio + Elector) ────────
    const sufragiosConElector = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.elector', 'elector')
      .where('rs.eleccion.id = :eleccionId', { eleccionId })
      .getMany();

    const totalSufragiosDocentes = sufragiosConElector.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.DOCENTE,
    ).length;

    const totalSufragiosEstudiantes = sufragiosConElector.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.ESTUDIANTE,
    ).length;

    const totalSufragiosEmitidos = sufragiosConElector.length;

    // ── 4. Electores habilitados por estamento (PadronElectoral) ──────────
    const padronConElector = await this.padronElectoralRepository
      .createQueryBuilder('pe')
      .leftJoinAndSelect('pe.elector', 'elector')
      .where('pe.eleccion.id = :eleccionId', { eleccionId })
      .andWhere('pe.estaHabilitado = true')
      .getMany();

    const totalHabilitadosDocentes = padronConElector.filter(
      (pe) => pe.elector?.estamento === EstamentoEnum.DOCENTE,
    ).length;

    const totalHabilitadosEstudiantes = padronConElector.filter(
      (pe) => pe.elector?.estamento === EstamentoEnum.ESTUDIANTE,
    ).length;

    const totalHabilitados = padronConElector.length;

    const participacionPorcentaje =
      totalHabilitados > 0
        ? parseFloat(((totalSufragiosEmitidos / totalHabilitados) * 100).toFixed(2))
        : 0;

    // ── 5. Frentes de la elección (DB) ─────────────────────────────────────
    const eleccionCargos = await this.eleccionCargoRepository.find({
      where: { eleccion: { id: eleccionId } },
      relations: ['frentes'],
    });

    const frentesDB = eleccionCargos.flatMap((ec) => ec.frentes ?? []);

    // ── 6. Votos por frente desde blockchain ────────────────────────────
    let fuenteVotos: 'blockchain' | 'simulado' = 'simulado';
    let votosBlockchainMap = new Map<string, number>(); // frenteId → votos

    try {
      fuenteVotos = 'blockchain';

      // Obtener los votos directamente por el ID del frente y elección
      for (const frente of frentesDB) {
        const votos = await this.blockchainService.obtenerVotos(eleccionId, frente.id);
        votosBlockchainMap.set(frente.id, votos);
      }
    } catch (_error) {
      // Si el blockchain no está disponible, continuamos con 0 votos
      // para no bloquear la generación del reporte estructural.
      fuenteVotos = 'simulado';
    }

    // ── 7. Calcular total de votos blockchain para porcentajes ─────────────
    const totalVotosBlockchain = Array.from(votosBlockchainMap.values()).reduce(
      (acc, v) => acc + v,
      0,
    );

    // ── 8. Calcular resultados paritarios por frente ───────────────────────
    const resultadosPorFrente: ResultadoFrenteParitario[] = frentesDB.map((frente) => {
      // Buscar votos en blockchain por el ID del frente
      let votosBlockchain = votosBlockchainMap.get(frente.id) ?? 0;

      const porcentajeTotal =
        totalVotosBlockchain > 0
          ? parseFloat(((votosBlockchain / totalVotosBlockchain) * 100).toFixed(2))
          : 0;

      // ── Ponderación paritaria ────────────────────────────────────────────
      // Como la blockchain no distingue votos por estamento, se estima
      // la participación de cada estamento de forma proporcional:
      //   votosEstimados_docente  = votosBlockchain * (sufragiosDocentes / totalSufragios)
      //   votosEstimados_estudiant = votosBlockchain * (sufragiosEstudiantes / totalSufragios)
      //
      // Luego el score de cada estamento se pondera sobre su padrón:
      //   scoreDocente  = (votosEst_doc / habilitadosDocentes) * 100
      //   scoreEstudiante = (votosEst_est / habilitadosEstudiantes) * 100
      //   resultadoPonderado = scoreDocente * 0.5 + scoreEstudiante * 0.5

      const propDocentes =
        totalSufragiosEmitidos > 0 ? totalSufragiosDocentes / totalSufragiosEmitidos : 0.5;
      const propEstudiantes =
        totalSufragiosEmitidos > 0 ? totalSufragiosEstudiantes / totalSufragiosEmitidos : 0.5;

      const votosEstDoc = votosBlockchain * propDocentes;
      const votosEstEst = votosBlockchain * propEstudiantes;

      const scoreDocente =
        totalHabilitadosDocentes > 0
          ? parseFloat(((votosEstDoc / totalHabilitadosDocentes) * 100).toFixed(4))
          : 0;

      const scoreEstudiante =
        totalHabilitadosEstudiantes > 0
          ? parseFloat(((votosEstEst / totalHabilitadosEstudiantes) * 100).toFixed(4))
          : 0;

      const resultadoPonderado = parseFloat(
        (scoreDocente * 0.5 + scoreEstudiante * 0.5).toFixed(4),
      );

      return {
        frenteId: frente.id,
        nombreFrente: frente.nombreFrente,
        sigla: frente.sigla,
        esOpcionGlobal: frente.esOpcionGlobal,
        votosBlockchain,
        porcentajeTotal,
        scoreDocente,
        scoreEstudiante,
        resultadoPonderado,
      };
    });

    // Ordenar de mayor a menor resultado ponderado
    resultadosPorFrente.sort((a, b) => b.resultadoPonderado - a.resultadoPonderado);

    // ── 9. Determinar ganador ──────────────────────────────────────────────
    const ganador =
      resultadosPorFrente.length > 0 && resultadosPorFrente[0].votosBlockchain > 0
        ? {
            frenteId: resultadosPorFrente[0].frenteId,
            nombreFrente: resultadosPorFrente[0].nombreFrente,
            sigla: resultadosPorFrente[0].sigla,
            resultadoPonderado: resultadosPorFrente[0].resultadoPonderado,
          }
        : null;

    // ── 10. Construir respuesta ────────────────────────────────────────────
    const resultado: ResultadoEscrutinioParitario = {
      eleccionId: eleccion.id,
      tituloEleccion: eleccion.titulo,
      fechaEleccion: eleccion.fecha,
      totalHabilitados,
      totalHabilitadosDocentes,
      totalHabilitadosEstudiantes,
      totalSufragiosEmitidos,
      totalSufragiosDocentes,
      totalSufragiosEstudiantes,
      participacionPorcentaje,
      resultadosPorFrente,
      ganador,
      fuenteVotos,
    };

    return createApiResponse(
      HttpStatus.OK,
      resultado,
      'Escrutinio paritario calculado correctamente.',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF18 — GENERAR REPORTE DE CONSOLIDACIÓN PARITARIA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF18 · Genera el reporte oficial de consolidación paritaria de una elección.
   *
   * Invoca `calcularResultadosParitarios` y enriquece el resultado con
   * metadatos de auditoría: fecha de generación y firma digital simulada
   * (SHA-256 del eleccionId + timestamp como identificador de integridad).
   *
   * @param eleccionId UUID de la elección.
   * @returns Reporte consolidado con firma y metadatos.
   * @throws NotFoundException si la elección no existe.
   * @throws ForbiddenException si la jornada sigue abierta.
   */
  async generarReporteConsolidacion(
    eleccionId: string,
  ): Promise<ApiResponse<ReporteConsolidacion>> {
    // Calcular resultados
    const escrutinioResponse = await this.calcularResultadosParitarios(eleccionId);
    const escrutinio = escrutinioResponse.data!;

    const fechaGeneracion = new Date().toISOString();

    // Firma simulada: concatenación hasheada de los datos clave
    const firmaSimulada = this.generarFirmaSimulada(
      eleccionId,
      fechaGeneracion,
      escrutinio.totalSufragiosEmitidos,
      escrutinio.ganador?.frenteId ?? 'SIN_GANADOR',
    );

    const reporte: ReporteConsolidacion = {
      reporte: escrutinio,
      fechaGeneracion,
      firmaSimulada,
      version: process.env.API_VERSION ?? '1.0',
    };

    return createApiResponse(
      HttpStatus.OK,
      reporte,
      'Reporte de consolidación paritaria generado correctamente.',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera una firma digital simulada usando una cadena de texto que resume
   * los datos clave del escrutinio. No reemplaza una firma criptográfica real;
   * sirve como identificador de integridad en entornos de demostración.
   *
   * @param eleccionId UUID de la elección.
   * @param timestamp  ISO timestamp de generación.
   * @param totalVotos Total de sufragios emitidos.
   * @param ganadorId  UUID o constante del frente ganador.
   * @returns Cadena hexadecimal de 64 caracteres (hash simulado).
   */
  private generarFirmaSimulada(
    eleccionId: string,
    timestamp: string,
    totalVotos: number,
    ganadorId: string,
  ): string {
    const payload = `${eleccionId}|${timestamp}|${totalVotos}|${ganadorId}`;
    // Firma deterministamente reproducible (sin dependencia de crypto para portabilidad)
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convertir a entero de 32 bits
    }
    // Extender a 64 caracteres simulando un hash SHA-256
    const base = Math.abs(hash).toString(16).padStart(8, '0');
    return Array.from({ length: 8 }, (_, i) => {
      const segment = (Math.abs(hash) * (i + 1) * 31337).toString(16).padStart(8, '0');
      return segment.slice(-8);
    }).join('') + base;
  }
}
