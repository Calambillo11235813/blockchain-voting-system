import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EstamentoEnum } from '../../../electores/entities/elector.entity';
import {
  CampoInternoPadron,
  ESQUEMAS_PADRON,
  EsquemaHojaPadron,
  FilaPadronNormalizada,
  ResultadoParseoPadron,
} from './padron-excel.schemas';
import {
  esCiValida,
  esCodigoValido,
  esRegistroValido,
  normalizarCi,
  parsearHabilitadoRector,
  splitNombreCompleto,
} from './padron-name-splitter';

function normalizarHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function encontrarHoja(
  sheetNames: string[],
  esquema: EsquemaHojaPadron,
): string | undefined {
  const normalizados = new Map(
    sheetNames.map(name => [normalizarHeader(name), name]),
  );

  for (const alias of esquema.sheetAliases) {
    const encontrada = normalizados.get(alias);
    if (encontrada) {
      return encontrada;
    }
  }

  return undefined;
}

function construirMapaColumnas(
  headerRow: unknown[],
  esquema: EsquemaHojaPadron,
): Map<CampoInternoPadron, number> {
  const columnMap = new Map<CampoInternoPadron, number>();

  for (let i = 0; i < headerRow.length; i++) {
    const normalizado = normalizarHeader(String(headerRow[i] ?? ''));
    if (!normalizado) {
      continue;
    }

    const campo = esquema.headerAliases[normalizado];
    if (campo && !columnMap.has(campo)) {
      columnMap.set(campo, i);
    }
  }

  return columnMap;
}

function validarCabeceras(
  sheetName: string,
  columnMap: Map<CampoInternoPadron, number>,
  esquema: EsquemaHojaPadron,
): void {
  const missing = esquema.requiredColumns.filter(col => !columnMap.has(col));

  if (missing.length > 0) {
    throw new BadRequestException(
      `Hoja '${sheetName}': cabeceras faltantes o no reconocidas: ${missing.join(', ')}.`,
    );
  }
}

function filaVacia(values: string[]): boolean {
  return values.every(v => v.length === 0);
}

function parsearFila(
  rawRow: unknown[],
  columnMap: Map<CampoInternoPadron, number>,
  esquema: EsquemaHojaPadron,
  sheetName: string,
  rowNumber: number,
): { row?: FilaPadronNormalizada; errors: string[] } {
  const prefijo = `Hoja ${sheetName}, Fila ${rowNumber}`;
  const errors: string[] = [];

  const getValue = (col: CampoInternoPadron): string => {
    const idx = columnMap.get(col);
    if (idx === undefined) {
      return '';
    }
    const raw = rawRow[idx];
    if (raw === null || raw === undefined) {
      return '';
    }
    return String(raw).trim();
  };

  const codFacultad = getValue('codFacultad');
  const facultad = getValue('facultad');
  const codLugar = getValue('codLugar');
  const lugarVotacion = getValue('lugarVotacion');
  const codCarrera = getValue('codCarrera');
  const carreraRaw = getValue('carrera');
  const registro = getValue('registro');
  const nombreCompleto = getValue('nombreCompleto');
  const ciRaw = getValue('ci');
  const rectorRaw = getValue('habilitadoRector');

  const valoresRelevantes = [
    codFacultad,
    facultad,
    codLugar,
    lugarVotacion,
    codCarrera,
    carreraRaw,
    registro,
    nombreCompleto,
    ciRaw,
    rectorRaw,
  ];

  if (filaVacia(valoresRelevantes)) {
    return { errors };
  }

  const missing: string[] = [];
  if (!codFacultad) missing.push('Cod.Fac.');
  if (!facultad) missing.push('Facultad');
  if (!codLugar) missing.push(esquema.estamento === EstamentoEnum.ESTUDIANTE ? 'Cod.lugar' : 'Cod.Lugar');
  if (!lugarVotacion) {
    missing.push(esquema.estamento === EstamentoEnum.ESTUDIANTE ? 'LUGAR DE VOTACION' : 'Lugar');
  }
  if (esquema.estamento === EstamentoEnum.ESTUDIANTE) {
    if (!codCarrera) missing.push('CARR-PL');
    if (!carreraRaw) missing.push('CARRERA');
  }
  if (!registro) {
    missing.push(esquema.estamento === EstamentoEnum.ESTUDIANTE ? 'Registro' : 'Cod.Docente');
  }
  if (!nombreCompleto) {
    missing.push(esquema.estamento === EstamentoEnum.ESTUDIANTE ? 'Nombre' : 'Docente');
  }
  if (!ciRaw) missing.push('CI');
  if (!rectorRaw) missing.push('RECTOR');

  if (missing.length > 0) {
    errors.push(`${prefijo}: faltan ${missing.join(', ')}`);
    return { errors };
  }

  if (!esRegistroValido(registro)) {
    errors.push(`${prefijo}: registro '${registro}' inválido (solo dígitos)`);
    return { errors };
  }

  const ci = normalizarCi(ciRaw);
  if (!esCiValida(ci)) {
    errors.push(`${prefijo}: CI '${ciRaw}' inválida (6–10 dígitos)`);
    return { errors };
  }

  if (!esCodigoValido(codFacultad)) {
    errors.push(`${prefijo}: Cod.Fac. '${codFacultad}' inválido`);
    return { errors };
  }

  if (!esCodigoValido(codLugar)) {
    errors.push(`${prefijo}: código de lugar '${codLugar}' inválido`);
    return { errors };
  }

  if (esquema.estamento === EstamentoEnum.ESTUDIANTE && !esCodigoValido(codCarrera)) {
    errors.push(`${prefijo}: CARR-PL '${codCarrera}' inválido`);
    return { errors };
  }

  const habilitadoRector = parsearHabilitadoRector(rectorRaw);
  if (habilitadoRector === null) {
    errors.push(`${prefijo}: RECTOR '${rectorRaw}' no reconocido (usar SI/NO)`);
    return { errors };
  }

  const { nombre, apellido, nombreAmbiguo } = splitNombreCompleto(nombreCompleto);
  if (nombreAmbiguo) {
    errors.push(`${prefijo}: nombre '${nombreCompleto}' con un solo token; revisar split`);
  }

  const carrera =
    esquema.estamento === EstamentoEnum.ESTUDIANTE ? carreraRaw : facultad;

  const row: FilaPadronNormalizada = {
    registro,
    ci,
    nombre,
    apellido,
    estamento: esquema.estamento,
    carrera,
    facultad,
    codFacultad,
    codCarrera: esquema.estamento === EstamentoEnum.ESTUDIANTE ? codCarrera : undefined,
    codLugar,
    lugarVotacion,
    habilitadoRector,
    __sheetName: sheetName,
    __rowNumber: rowNumber,
  };

  return { row, errors };
}

function parsearHoja(
  workbook: XLSX.WorkBook,
  esquema: EsquemaHojaPadron,
): { rows: FilaPadronNormalizada[]; errors: string[]; sheetName?: string } {
  const sheetName = encontrarHoja(workbook.SheetNames, esquema);
  if (!sheetName) {
    return { rows: [], errors: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (raw.length === 0) {
    throw new BadRequestException(`Hoja '${sheetName}' no contiene cabeceras.`);
  }

  const columnMap = construirMapaColumnas(raw[0] as unknown[], esquema);
  validarCabeceras(sheetName, columnMap, esquema);

  const rows: FilaPadronNormalizada[] = [];
  const errors: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const result = parsearFila(
      raw[i] as unknown[],
      columnMap,
      esquema,
      sheetName,
      i + 1,
    );
    errors.push(...result.errors);
    if (result.row) {
      rows.push(result.row);
    }
  }

  return { rows, errors, sheetName };
}

/**
 * Parsea un archivo Excel de padrón con hojas Estudiantes y/o Docentes.
 */
export function parsePadronExcelBuffer(buffer: Buffer): ResultadoParseoPadron {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  if (!workbook.SheetNames.length) {
    throw new BadRequestException('El archivo no contiene hojas.');
  }

  const allRows: FilaPadronNormalizada[] = [];
  const allErrors: string[] = [];
  let hojasEncontradas = 0;

  for (const esquema of ESQUEMAS_PADRON) {
    const { rows, errors, sheetName } = parsearHoja(workbook, esquema);
    if (sheetName) {
      hojasEncontradas += 1;
      allRows.push(...rows);
      allErrors.push(...errors);
    }
  }

  if (hojasEncontradas === 0) {
    throw new BadRequestException(
      'El archivo debe contener al menos una hoja válida: Estudiantes o Docentes.',
    );
  }

  const estudiantesProcesados = allRows.filter(
    r => r.estamento === EstamentoEnum.ESTUDIANTE,
  ).length;
  const docentesProcesados = allRows.filter(
    r => r.estamento === EstamentoEnum.DOCENTE,
  ).length;

  return {
    rows: allRows,
    errors: allErrors,
    estudiantesProcesados,
    docentesProcesados,
  };
}
