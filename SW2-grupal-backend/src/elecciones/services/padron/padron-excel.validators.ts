import { EstamentoEnum } from '../../../electores/entities/elector.entity';
import { FilaPadronNormalizada } from './padron-excel.schemas';
import { mismaPersonaPorCi } from './padron-excel.merger';

/**
 * Valida duplicados antes de fusionar filas dual-rol.
 * Permite la misma CI en hojas distintas si el registro difiere (docente que también estudia).
 */
export function validateNoDuplicatesPadron(rows: FilaPadronNormalizada[]): string[] {
  const errors: string[] = [];

  const byRegistro = new Map<string, string[]>();
  const byCi = new Map<string, FilaPadronNormalizada[]>();

  for (const row of rows) {
    const ubicacion = `Hoja ${row.__sheetName}, Fila ${row.__rowNumber}`;

    if (!byRegistro.has(row.registro)) {
      byRegistro.set(row.registro, []);
    }
    byRegistro.get(row.registro)!.push(ubicacion);

    if (!byCi.has(row.ci)) {
      byCi.set(row.ci, []);
    }
    byCi.get(row.ci)!.push(row);
  }

  for (const [registro, ubicaciones] of byRegistro.entries()) {
    if (ubicaciones.length > 1) {
      errors.push(`registro '${registro}' repetido en ${ubicaciones.join('; ')}`);
    }
  }

  for (const [ci, filas] of byCi.entries()) {
    if (filas.length <= 1) {
      continue;
    }

    const porHoja = new Map<string, FilaPadronNormalizada[]>();
    for (const fila of filas) {
      const hoja = fila.__sheetName.toLowerCase();
      const grupo = porHoja.get(hoja) ?? [];
      grupo.push(fila);
      porHoja.set(hoja, grupo);
    }

    // Duplicado dentro de la misma hoja
    for (const [hoja, grupo] of porHoja.entries()) {
      if (grupo.length > 1) {
        const ubicaciones = grupo.map(f => `Hoja ${f.__sheetName}, Fila ${f.__rowNumber}`).join('; ');
        errors.push(`ci '${ci}' repetida en ${ubicaciones}`);
      }
    }

    // Misma CI cross-sheet: permitido solo si parece dual-rol (estudiante + docente)
    if (porHoja.size > 1) {
      const estamentos = new Set(filas.map(f => f.estamento));
      const esDualRol =
        filas.length === 2 &&
        estamentos.has(EstamentoEnum.ESTUDIANTE) &&
        estamentos.has(EstamentoEnum.DOCENTE) &&
        filas.every((fila, _, arr) => mismaPersonaPorCi(fila, arr[0]));

      if (!esDualRol) {
        const ubicaciones = filas
          .map(f => `Hoja ${f.__sheetName}, Fila ${f.__rowNumber}`)
          .join('; ');
        errors.push(
          `ci '${ci}' repetida con datos inconsistentes en ${ubicaciones}`,
        );
      }
    }
  }

  return errors;
}
