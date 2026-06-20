import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePadronExcelBuffer } from '../src/elecciones/services/padron/padron-excel.parser';
import { validateNoDuplicatesPadron } from '../src/elecciones/services/padron/padron-excel.validators';
import { fusionarFilasDualRol } from '../src/elecciones/services/padron/padron-excel.merger';

const files = [
  resolve(__dirname, '../../Datos de prueba/padron chiquitana claustro 2025 rectorado.xlsx'),
  resolve(__dirname, '../../Datos de prueba/Padron_Sintetico_Completo_UAGRM.xlsx'),
];

for (const f of files) {
  const buf = readFileSync(f);
  try {
    const r = parsePadronExcelBuffer(buf);
    const dups = validateNoDuplicatesPadron(r.rows);
    const { rows: fusionadas, advertencias } = fusionarFilasDualRol(r.rows);
    console.log('\n===', f.split(/[/\\]/).pop(), '===');
    console.log('rows parseadas:', r.rows.length, 'fusionadas:', fusionadas.length);
    console.log('est:', r.estudiantesProcesados, 'doc:', r.docentesProcesados);
    console.log('errors:', r.errors.length, 'dups:', dups.length, 'dualRol:', advertencias.length);
    if (r.errors.length) {
      console.log('sample errors:', r.errors.slice(0, 5));
    }
    if (dups.length) {
      console.log('sample dups:', dups.slice(0, 3));
    }
    if (advertencias.length) {
      console.log('fusiones:', advertencias);
    }
    console.log('sample row:', JSON.stringify(fusionadas[0]));
  } catch (e) {
    const err = e as Error;
    console.log('\nFAIL', f, err.message);
  }
}
