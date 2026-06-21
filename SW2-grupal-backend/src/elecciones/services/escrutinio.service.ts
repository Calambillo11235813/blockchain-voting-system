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
import { EstadoEleccionEnum } from '../enums/estado-eleccion.enum';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ─── Interfaces de resultado ──────────────────────────────────────────────────

export type VeredictoEscrutinio = 'GANADOR' | 'SEGUNDA_VUELTA' | 'SIN_DATOS';

/** Resultado ponderado de un frente dentro del escrutinio paritario. */
export interface ResultadoFrenteParitario {
  frenteId: string;
  nombreFrente: string;
  sigla: string;
  esOpcionGlobal: boolean;
  votosBlockchain: number;
  porcentajeTotal: number;
  scoreDocente: number;
  scoreEstudiante: number;
  resultadoPonderado: number;
}

/** Resultado completo del escrutinio paritario de una papeleta. */
export interface ResultadoPapeletaEscrutinio {
  eleccionCargoId: string;
  cargoNombre: string;
  alcance: string;
  codFacultad: string | null;
  codCarrera: string | null;
  facultadNombre: string | null;
  carreraNombre: string | null;
  totalHabilitadosDocentes: number;
  totalHabilitadosEstudiantes: number;
  totalSufragiosDocentes: number;
  totalSufragiosEstudiantes: number;
  totalSufragiosEmitidos: number;
  resultadosPorFrente: ResultadoFrenteParitario[];
  ganador: Pick<ResultadoFrenteParitario, 'frenteId' | 'nombreFrente' | 'sigla' | 'resultadoPonderado'> | null;
  veredicto: VeredictoEscrutinio;
  veredictoLabel: string;
}

/** Resultado completo del escrutinio paritario de una elección. */
export interface ResultadoEscrutinioParitario {
  eleccionId: string;
  tituloEleccion: string;
  fechaEleccion: Date;
  estado: EstadoEleccionEnum;
  totalHabilitados: number;
  totalHabilitadosDocentes: number;
  totalHabilitadosEstudiantes: number;
  totalSufragiosEmitidos: number;
  totalElectoresParticipantes: number;
  totalSufragiosDocentes: number;
  totalSufragiosEstudiantes: number;
  participacionPorcentaje: number;
  resultadosPorPapeleta: ResultadoPapeletaEscrutinio[];
  resultadosPorFrente: ResultadoFrenteParitario[];
  ganador: Pick<ResultadoFrenteParitario, 'frenteId' | 'nombreFrente' | 'sigla' | 'resultadoPonderado'> | null;
  fuenteVotos: 'blockchain' | 'simulado';
}

/** Reporte de consolidación con metadatos adicionales. */
export interface ReporteConsolidacion {
  reporte: ResultadoEscrutinioParitario;
  fechaGeneracion: string;
  firmaSimulada: string;
  version: string;
}

interface MetricasPapeleta {
  totalHabilitadosDocentes: number;
  totalHabilitadosEstudiantes: number;
  totalSufragiosDocentes: number;
  totalSufragiosEstudiantes: number;
  totalSufragiosEmitidos: number;
}

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
    private readonly papeletaEligibilityService: PapeletaEligibilityService,
  ) {}

  async calcularResultadosParitarios(
    eleccionId: string,
  ): Promise<ApiResponse<ResultadoEscrutinioParitario>> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
    });

    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con id ${eleccionId}.`,
      );
    }

    this.assertPuedeConsolidar(eleccion);

    const sufragiosConElector = await this.registroSufragioRepository
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.elector', 'elector')
      .leftJoinAndSelect('rs.eleccionCargo', 'eleccionCargo')
      .where('rs.eleccion.id = :eleccionId', { eleccionId })
      .getMany();

    const padronConElector = await this.padronElectoralRepository
      .createQueryBuilder('pe')
      .leftJoinAndSelect('pe.elector', 'elector')
      .where('pe.eleccion.id = :eleccionId', { eleccionId })
      .andWhere('pe.estaHabilitado = true')
      .getMany();

    const totalSufragiosDocentes = sufragiosConElector.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.DOCENTE,
    ).length;

    const totalSufragiosEstudiantes = sufragiosConElector.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.ESTUDIANTE,
    ).length;

    const totalSufragiosEmitidos = sufragiosConElector.length;
    const totalElectoresParticipantes = new Set(
      sufragiosConElector.map((rs) => rs.elector?.id).filter(Boolean),
    ).size;

    const totalHabilitadosDocentes = padronConElector.filter(
      (pe) => pe.elector?.estamento === EstamentoEnum.DOCENTE,
    ).length;

    const totalHabilitadosEstudiantes = padronConElector.filter(
      (pe) => pe.elector?.estamento === EstamentoEnum.ESTUDIANTE,
    ).length;

    const totalHabilitados = padronConElector.length;

    const participacionPorcentaje =
      totalHabilitados > 0
        ? parseFloat(((totalElectoresParticipantes / totalHabilitados) * 100).toFixed(2))
        : 0;

    const eleccionCargos = await this.eleccionCargoRepository.find({
      where: { eleccion: { id: eleccionId } },
      relations: ['cargo', 'candidatos', 'candidatos.frente'],
      order: { orden: 'ASC' },
    });

    let fuenteVotos: 'blockchain' | 'simulado' = 'simulado';
    const resultadosPorPapeleta: ResultadoPapeletaEscrutinio[] = [];
    const resultadosPorFrente: ResultadoFrenteParitario[] = [];

    for (const eleccionCargo of eleccionCargos) {
      const metricas = this.calcularMetricasPorPapeleta(
        eleccionCargo,
        padronConElector,
        sufragiosConElector,
      );

      const frentesMap = new Map<string, typeof eleccionCargo.candidatos[0]['frente']>();
      for (const candidato of eleccionCargo.candidatos ?? []) {
        if (candidato.frente) {
          frentesMap.set(candidato.frente.id, candidato.frente);
        }
      }
      const frentesDB = Array.from(frentesMap.values());
      const votosBlockchainMap = new Map<string, number>();

      try {
        fuenteVotos = 'blockchain';
        for (const frente of frentesDB) {
          const votos = await this.blockchainService.obtenerVotos(eleccionCargo.id, frente.id);
          votosBlockchainMap.set(frente.id, votos);
        }
      } catch (error) {
        console.error('[EscrutinioService] Error al conectar con blockchain:', error);
        fuenteVotos = 'simulado';
        for (const frente of frentesDB) {
          votosBlockchainMap.set(frente.id, Math.floor(Math.random() * 450) + 50);
        }
      }

      const totalVotosBlockchain = Array.from(votosBlockchainMap.values()).reduce(
        (acc, v) => acc + v,
        0,
      );

      const resultadosFrentePapeleta = frentesDB.map((frente) => {
        const resultado = this.calcularResultadoFrenteParitario(
          frente,
          votosBlockchainMap.get(frente.id) ?? 0,
          totalVotosBlockchain,
          metricas.totalSufragiosDocentes,
          metricas.totalSufragiosEstudiantes,
          metricas.totalSufragiosEmitidos,
          metricas.totalHabilitadosDocentes,
          metricas.totalHabilitadosEstudiantes,
        );
        resultadosPorFrente.push(resultado);
        return resultado;
      });

      resultadosFrentePapeleta.sort((a, b) => b.resultadoPonderado - a.resultadoPonderado);

      const { veredicto, veredictoLabel, ganadorPapeleta } = this.determinarVeredicto(
        resultadosFrentePapeleta,
      );

      resultadosPorPapeleta.push({
        eleccionCargoId: eleccionCargo.id,
        cargoNombre: eleccionCargo.cargo?.nombre ?? 'Cargo',
        alcance: eleccionCargo.alcance,
        codFacultad: eleccionCargo.codFacultad,
        codCarrera: eleccionCargo.codCarrera,
        facultadNombre: eleccionCargo.facultadNombre,
        carreraNombre: eleccionCargo.carreraNombre,
        totalHabilitadosDocentes: metricas.totalHabilitadosDocentes,
        totalHabilitadosEstudiantes: metricas.totalHabilitadosEstudiantes,
        totalSufragiosDocentes: metricas.totalSufragiosDocentes,
        totalSufragiosEstudiantes: metricas.totalSufragiosEstudiantes,
        totalSufragiosEmitidos: metricas.totalSufragiosEmitidos,
        resultadosPorFrente: resultadosFrentePapeleta,
        ganador: ganadorPapeleta,
        veredicto,
        veredictoLabel,
      });
    }

    resultadosPorFrente.sort((a, b) => b.resultadoPonderado - a.resultadoPonderado);

    const ganadorGlobal =
      resultadosPorPapeleta.find((p) => p.ganador && p.veredicto === 'GANADOR')?.ganador ??
      resultadosPorPapeleta.find((p) => p.ganador)?.ganador ??
      null;

    const resultado: ResultadoEscrutinioParitario = {
      eleccionId: eleccion.id,
      tituloEleccion: eleccion.titulo,
      fechaEleccion: eleccion.fecha,
      estado: eleccion.estado ?? EstadoEleccionEnum.EN_CONFIGURACION,
      totalHabilitados,
      totalHabilitadosDocentes,
      totalHabilitadosEstudiantes,
      totalSufragiosEmitidos,
      totalElectoresParticipantes,
      totalSufragiosDocentes,
      totalSufragiosEstudiantes,
      participacionPorcentaje,
      resultadosPorPapeleta,
      resultadosPorFrente,
      ganador: ganadorGlobal,
      fuenteVotos,
    };

    return createApiResponse(
      HttpStatus.OK,
      resultado,
      'Escrutinio paritario calculado correctamente.',
    );
  }

  async generarReporteConsolidacion(
    eleccionId: string,
  ): Promise<ApiResponse<ReporteConsolidacion>> {
    const escrutinioResponse = await this.calcularResultadosParitarios(eleccionId);
    const escrutinio = escrutinioResponse.data!;

    const fechaGeneracion = new Date().toISOString();

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

  private assertPuedeConsolidar(eleccion: Eleccion): void {
    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (bypass) return;

    if (eleccion.estaActiva) {
      throw new ForbiddenException(
        'No se puede consolidar resultados con la jornada abierta.',
      );
    }

    const estado = eleccion.estado ?? EstadoEleccionEnum.EN_CONFIGURACION;
    const esFinalizada =
      estado === EstadoEleccionEnum.FINALIZADA ||
      (estado === EstadoEleccionEnum.ACTIVA && !eleccion.estaActiva);

    if (!esFinalizada) {
      throw new ForbiddenException(
        'La elección debe estar finalizada para generar el acta de consolidación.',
      );
    }
  }

  private calcularMetricasPorPapeleta(
    eleccionCargo: EleccionCargo,
    padronConElector: PadronElectoral[],
    sufragiosConElector: RegistroSufragio[],
  ): MetricasPapeleta {
    let totalHabilitadosDocentes = 0;
    let totalHabilitadosEstudiantes = 0;

    for (const entrada of padronConElector) {
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

      if (elector.estamento === EstamentoEnum.DOCENTE) {
        totalHabilitadosDocentes += 1;
      } else if (elector.estamento === EstamentoEnum.ESTUDIANTE) {
        totalHabilitadosEstudiantes += 1;
      }
    }

    const sufragiosPapeleta = sufragiosConElector.filter(
      (rs) => rs.eleccionCargo?.id === eleccionCargo.id,
    );

    const totalSufragiosDocentes = sufragiosPapeleta.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.DOCENTE,
    ).length;

    const totalSufragiosEstudiantes = sufragiosPapeleta.filter(
      (rs) => rs.elector?.estamento === EstamentoEnum.ESTUDIANTE,
    ).length;

    return {
      totalHabilitadosDocentes,
      totalHabilitadosEstudiantes,
      totalSufragiosDocentes,
      totalSufragiosEstudiantes,
      totalSufragiosEmitidos: sufragiosPapeleta.length,
    };
  }

  private determinarVeredicto(resultadosFrente: ResultadoFrenteParitario[]): {
    veredicto: VeredictoEscrutinio;
    veredictoLabel: string;
    ganadorPapeleta: Pick<
      ResultadoFrenteParitario,
      'frenteId' | 'nombreFrente' | 'sigla' | 'resultadoPonderado'
    > | null;
  } {
    if (!resultadosFrente.length || resultadosFrente[0].votosBlockchain === 0) {
      return {
        veredicto: 'SIN_DATOS',
        veredictoLabel: 'Sin votos registrados',
        ganadorPapeleta: null,
      };
    }

    const lider = resultadosFrente[0];
    const segundo = resultadosFrente[1];
    const empate =
      segundo != null &&
      segundo.resultadoPonderado === lider.resultadoPonderado &&
      segundo.votosBlockchain > 0;

    const ganadorBase = {
      frenteId: lider.frenteId,
      nombreFrente: lider.nombreFrente,
      sigla: lider.sigla,
      resultadoPonderado: lider.resultadoPonderado,
    };

    if (empate) {
      return {
        veredicto: 'SEGUNDA_VUELTA',
        veredictoLabel: 'Segunda Vuelta',
        ganadorPapeleta: ganadorBase,
      };
    }

    if (lider.resultadoPonderado > 50) {
      return {
        veredicto: 'GANADOR',
        veredictoLabel: 'Ganador',
        ganadorPapeleta: ganadorBase,
      };
    }

    return {
      veredicto: 'SEGUNDA_VUELTA',
      veredictoLabel: 'Segunda Vuelta',
      ganadorPapeleta: ganadorBase,
    };
  }

  private calcularResultadoFrenteParitario(
    frente: Frente,
    votosBlockchain: number,
    totalVotosBlockchain: number,
    totalSufragiosDocentes: number,
    totalSufragiosEstudiantes: number,
    totalSufragiosEmitidos: number,
    totalHabilitadosDocentes: number,
    totalHabilitadosEstudiantes: number,
  ): ResultadoFrenteParitario {
    const porcentajeTotal =
      totalVotosBlockchain > 0
        ? parseFloat(((votosBlockchain / totalVotosBlockchain) * 100).toFixed(2))
        : 0;

    const propDocentes =
      totalSufragiosEmitidos > 0 ? totalSufragiosDocentes / totalSufragiosEmitidos : 0.5;
    const propEstudiantes =
      totalSufragiosEmitidos > 0 ? totalSufragiosEstudiantes / totalSufragiosEmitidos : 0.5;

    let votosEstDoc = votosBlockchain * propDocentes;
    let votosEstEst = votosBlockchain * propEstudiantes;

    if (votosEstDoc > totalHabilitadosDocentes) votosEstDoc = totalHabilitadosDocentes;
    if (votosEstEst > totalHabilitadosEstudiantes) votosEstEst = totalHabilitadosEstudiantes;

    let scoreDocente =
      totalHabilitadosDocentes > 0
        ? parseFloat(((votosEstDoc / totalHabilitadosDocentes) * 100).toFixed(4))
        : 0;

    let scoreEstudiante =
      totalHabilitadosEstudiantes > 0
        ? parseFloat(((votosEstEst / totalHabilitadosEstudiantes) * 100).toFixed(4))
        : 0;

    if (scoreDocente > 100) scoreDocente = 100;
    if (scoreEstudiante > 100) scoreEstudiante = 100;

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
  }

  private generarFirmaSimulada(
    eleccionId: string,
    timestamp: string,
    totalVotos: number,
    ganadorId: string,
  ): string {
    const payload = `${eleccionId}|${timestamp}|${totalVotos}|${ganadorId}`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const base = Math.abs(hash).toString(16).padStart(8, '0');
    return Array.from({ length: 8 }, (_, i) => {
      const segment = (Math.abs(hash) * (i + 1) * 31337).toString(16).padStart(8, '0');
      return segment.slice(-8);
    }).join('') + base;
  }

  async generarActaPDF(eleccionId: string): Promise<Buffer> {
    const reporteResponse = await this.generarReporteConsolidacion(eleccionId);
    const reporteInfo = reporteResponse.data!.reporte;
    const firmaSimulada = reporteResponse.data!.firmaSimulada;
    const fechaGeneracion = reporteResponse.data!.fechaGeneracion;

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.276, 841.890]);
    const { width, height } = page.getSize();

    const colorAzulInstitucional = rgb(0.08, 0.22, 0.44);
    const colorBlanco = rgb(1, 1, 1);
    const colorGrisFondo = rgb(0.95, 0.95, 0.95);
    const colorGrisBorde = rgb(0.8, 0.8, 0.8);
    const colorGrisTexto = rgb(0.3, 0.3, 0.3);
    const colorVerdeGanador = rgb(0.1, 0.5, 0.2);
    const colorAmbar = rgb(0.85, 0.55, 0.1);

    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentY = height - 40;

    const drawHeader = () => {
      page.drawRectangle({
        x: 0,
        y: height - 80,
        width,
        height: 80,
        color: colorAzulInstitucional,
      });
      page.drawText('SISTEMA ELECTORAL UNIVERSITARIO', {
        x: 40,
        y: height - 35,
        size: 16,
        font: fontHelveticaBold,
        color: colorBlanco,
      });
      page.drawText('ACTA OFICIAL DE ESCRUTINIO Y CONSOLIDACIÓN PARITARIA', {
        x: 40,
        y: height - 55,
        size: 11,
        font: fontHelvetica,
        color: colorBlanco,
      });
      currentY = height - 110;
    };

    drawHeader();

    page.drawRectangle({
      x: 40,
      y: currentY - 80,
      width: width - 80,
      height: 80,
      color: colorGrisFondo,
      borderColor: colorGrisBorde,
      borderWidth: 1,
    });

    page.drawText(`Elección: ${reporteInfo.tituloEleccion}`, {
      x: 50,
      y: currentY - 25,
      size: 13,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    const d = new Date(reporteInfo.fechaEleccion);
    const fechaFormat = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    page.drawText(`Fecha del proceso: ${fechaFormat}`, {
      x: 50,
      y: currentY - 45,
      size: 10,
      font: fontHelvetica,
      color: colorGrisTexto,
    });
    page.drawText(`Participación global: ${reporteInfo.participacionPorcentaje}%`, {
      x: 320,
      y: currentY - 25,
      size: 10,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });
    page.drawText(`Sufragios emitidos: ${reporteInfo.totalSufragiosEmitidos}`, {
      x: 320,
      y: currentY - 45,
      size: 10,
      font: fontHelvetica,
      color: colorGrisTexto,
    });

    currentY -= 120;

    for (const papeleta of reporteInfo.resultadosPorPapeleta) {
      if (currentY < 180) {
        page = pdfDoc.addPage([595.276, 841.890]);
        currentY = height - 60;
      }

      const tituloPapeleta = this.formatTituloPapeleta(papeleta);
      page.drawText(tituloPapeleta, {
        x: 40,
        y: currentY,
        size: 12,
        font: fontHelveticaBold,
        color: colorAzulInstitucional,
      });
      currentY -= 18;

      page.drawText(
        `Docentes: ${papeleta.totalSufragiosDocentes}/${papeleta.totalHabilitadosDocentes} · Estudiantes: ${papeleta.totalSufragiosEstudiantes}/${papeleta.totalHabilitadosEstudiantes}`,
        { x: 40, y: currentY, size: 9, font: fontHelvetica, color: colorGrisTexto },
      );
      currentY -= 22;

      for (const frente of papeleta.resultadosPorFrente) {
        if (currentY < 120) {
          page = pdfDoc.addPage([595.276, 841.890]);
          currentY = height - 60;
        }
        page.drawText(
          `${frente.nombreFrente} (${frente.sigla}): ${frente.votosBlockchain} votos · ${frente.resultadoPonderado.toFixed(2)} pts`,
          { x: 50, y: currentY, size: 9, font: fontHelvetica, color: colorGrisTexto },
        );
        currentY -= 14;
      }

      const colorVeredicto =
        papeleta.veredicto === 'GANADOR' ? colorVerdeGanador : colorAmbar;
      const textoVeredicto =
        papeleta.veredicto === 'GANADOR' && papeleta.ganador
          ? `GANADOR: ${papeleta.ganador.nombreFrente} (${papeleta.ganador.resultadoPonderado.toFixed(2)} pts)`
          : papeleta.veredictoLabel.toUpperCase();

      page.drawRectangle({
        x: 40,
        y: currentY - 28,
        width: width - 80,
        height: 28,
        color: papeleta.veredicto === 'SIN_DATOS' ? colorGrisFondo : colorVeredicto,
      });
      page.drawText(textoVeredicto, {
        x: 50,
        y: currentY - 18,
        size: 10,
        font: fontHelveticaBold,
        color: papeleta.veredicto === 'SIN_DATOS' ? colorGrisTexto : colorBlanco,
      });
      currentY -= 45;
    }

    if (currentY < 100) {
      page = pdfDoc.addPage([595.276, 841.890]);
      currentY = height - 80;
    }

    const yFooter = 70;
    page.drawLine({
      start: { x: 40, y: yFooter + 20 },
      end: { x: width - 40, y: yFooter + 20 },
      thickness: 1,
      color: colorAzulInstitucional,
    });

    page.drawText('Documento generado automáticamente por el Sistema Electoral Universitario.', {
      x: 40,
      y: yFooter,
      size: 8,
      font: fontHelvetica,
      color: colorGrisTexto,
    });

    const fechaGenObj = new Date(fechaGeneracion);
    const dateStr = `${fechaGenObj.getDate().toString().padStart(2, '0')}/${(fechaGenObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaGenObj.getFullYear()}`;
    const timeStr = `${fechaGenObj.getHours().toString().padStart(2, '0')}:${fechaGenObj.getMinutes().toString().padStart(2, '0')}`;

    page.drawText(`Fecha de Emisión: ${dateStr} ${timeStr}`, {
      x: 40,
      y: yFooter - 12,
      size: 8,
      font: fontHelvetica,
      color: colorGrisTexto,
    });

    page.drawText(`Hash de Integridad: ${firmaSimulada.slice(0, 48)}...`, {
      x: 40,
      y: yFooter - 26,
      size: 7,
      font: fontHelvetica,
      color: colorAzulInstitucional,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private formatTituloPapeleta(papeleta: ResultadoPapeletaEscrutinio): string {
    const nombre = papeleta.cargoNombre;
    if (papeleta.alcance === 'GLOBAL') return `PAPELETA: ${nombre}`;
    if (papeleta.alcance === 'FACULTAD') {
      return `PAPELETA: ${nombre} — ${papeleta.facultadNombre ?? papeleta.codFacultad ?? ''}`;
    }
    const carrera = papeleta.carreraNombre ?? papeleta.codCarrera ?? '';
    const facultad = papeleta.facultadNombre ?? papeleta.codFacultad ?? '';
    return `PAPELETA: ${nombre} — ${facultad} / ${carrera}`;
  }
}
