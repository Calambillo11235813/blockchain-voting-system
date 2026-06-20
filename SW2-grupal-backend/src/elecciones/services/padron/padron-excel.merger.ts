import { EstamentoEnum } from '../../../electores/entities/elector.entity';
import { FilaPadronNormalizada } from './padron-excel.schemas';

export interface ResultadoFusionPadron {
  rows: FilaPadronNormalizada[];
  advertencias: string[];
}

function normalizarNombreCompleto(row: FilaPadronNormalizada): string {
  return `${row.nombre} ${row.apellido}`.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Fusiona filas con la misma CI cuando una persona aparece como estudiante y docente.
 * Conserva el registro estudiantil en `registro` y el Cod.Docente en `registroDocente`.
 */
export function fusionarFilasDualRol(rows: FilaPadronNormalizada[]): ResultadoFusionPadron {
  const advertencias: string[] = [];
  const byCi = new Map<string, FilaPadronNormalizada[]>();

  for (const row of rows) {
    const grupo = byCi.get(row.ci) ?? [];
    grupo.push(row);
    byCi.set(row.ci, grupo);
  }

  const fusionadas: FilaPadronNormalizada[] = [];

  for (const [ci, grupo] of byCi.entries()) {
    if (grupo.length === 1) {
      fusionadas.push(grupo[0]);
      continue;
    }

    const estudiante = grupo.find(r => r.estamento === EstamentoEnum.ESTUDIANTE);
    const docente = grupo.find(r => r.estamento === EstamentoEnum.DOCENTE);

    if (grupo.length === 2 && estudiante && docente) {
      fusionadas.push({
        ...estudiante,
        registroDocente: docente.registro,
        estamento: EstamentoEnum.DOCENTE,
        habilitadoRector: estudiante.habilitadoRector || docente.habilitadoRector,
        codLugar: estudiante.codLugar || docente.codLugar,
        lugarVotacion: estudiante.lugarVotacion || docente.lugarVotacion,
      });

      advertencias.push(
        `CI '${ci}' fusionada (estudiante + docente): registro ${estudiante.registro}, cod. docente ${docente.registro}.`,
      );
      continue;
    }

    fusionadas.push(...grupo);
  }

  return { rows: fusionadas, advertencias };
}

/** Compara si dos filas con la misma CI parecen ser la misma persona. */
export function mismaPersonaPorCi(a: FilaPadronNormalizada, b: FilaPadronNormalizada): boolean {
  return normalizarNombreCompleto(a) === normalizarNombreCompleto(b);
}
