import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { EstamentoEnum } from '../../../electores/entities/elector.entity';
import { parsePadronExcelBuffer } from './padron-excel.parser';
import { validateNoDuplicatesPadron } from './padron-excel.validators';

function crearWorkbookPadron(
  estudiantes: unknown[][],
  docentes: unknown[][],
): Buffer {
  const wb = XLSX.utils.book_new();

  const wsEst = XLSX.utils.aoa_to_sheet(estudiantes);
  XLSX.utils.book_append_sheet(wb, wsEst, 'Estudiantes');

  const wsDoc = XLSX.utils.aoa_to_sheet(docentes);
  XLSX.utils.book_append_sheet(wb, wsDoc, 'Docentes');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const HEADER_ESTUDIANTES = [
  'Cod.Fac.',
  'Facultad',
  'Cod.lugar',
  'LUGAR DE VOTACION',
  'CARR-PL',
  'CARRERA',
  'Registro',
  'Nombre',
  'CI',
  'RECTOR',
];

const HEADER_DOCENTES = [
  'Cod.Fac.',
  'Facultad',
  'Cod.Lugar',
  'Lugar',
  'Cod.Docente',
  'Docente',
  'C.I.',
  'RECTOR',
];

describe('padron-excel.parser', () => {
  it('parsea hojas Estudiantes y Docentes correctamente', () => {
    const buffer = crearWorkbookPadron(
      [
        HEADER_ESTUDIANTES,
        [
          '01',
          'CIENCIAS',
          'L01',
          'AUDITORIO A',
          'CP01',
          'INFORMATICA',
          '202012345',
          'PEREZ LOPEZ JUAN',
          '12345678',
          'SI',
        ],
      ],
      [
        HEADER_DOCENTES,
        [
          '02',
          'INGENIERIA',
          'L02',
          'SALON B',
          '90001',
          'RODRIGUEZ MARTINEZ ANA',
          '87654321',
          'NO',
        ],
      ],
    );

    const result = parsePadronExcelBuffer(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.estudiantesProcesados).toBe(1);
    expect(result.docentesProcesados).toBe(1);

    const estudiante = result.rows.find(r => r.estamento === EstamentoEnum.ESTUDIANTE)!;
    expect(estudiante.registro).toBe('202012345');
    expect(estudiante.ci).toBe('12345678');
    expect(estudiante.nombre).toBe('JUAN');
    expect(estudiante.apellido).toBe('PEREZ LOPEZ');
    expect(estudiante.carrera).toBe('INFORMATICA');
    expect(estudiante.codCarrera).toBe('CP01');
    expect(estudiante.habilitadoRector).toBe(true);
    expect(estudiante.codLugar).toBe('L01');
    expect(estudiante.lugarVotacion).toBe('AUDITORIO A');

    const docente = result.rows.find(r => r.estamento === EstamentoEnum.DOCENTE)!;
    expect(docente.registro).toBe('90001');
    expect(docente.carrera).toBe('INGENIERIA');
    expect(docente.facultad).toBe('INGENIERIA');
    expect(docente.habilitadoRector).toBe(false);
  });

  it('rechaza archivo sin hojas válidas', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['col1', 'col2']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Otra');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    expect(() => parsePadronExcelBuffer(buffer)).toThrow(BadRequestException);
  });

  it('detecta duplicados cross-sheet con datos inconsistentes', () => {
    const buffer = crearWorkbookPadron(
      [
        HEADER_ESTUDIANTES,
        [
          '01',
          'CIENCIAS',
          'L01',
          'AUDITORIO A',
          'CP01',
          'INFORMATICA',
          '202012345',
          'PEREZ LOPEZ JUAN',
          '12345678',
          'SI',
        ],
      ],
      [
        HEADER_DOCENTES,
        [
          '02',
          'INGENIERIA',
          'L02',
          'SALON B',
          '90001',
          'RODRIGUEZ MARTINEZ ANA',
          '12345678',
          'NO',
        ],
      ],
    );

    const { rows } = parsePadronExcelBuffer(buffer);
    const dupErrors = validateNoDuplicatesPadron(rows);

    expect(dupErrors.some(e => e.includes('ci'))).toBe(true);
  });

  it('permite cargar solo una hoja válida', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      HEADER_ESTUDIANTES,
      [
        '01',
        'CIENCIAS',
        'L01',
        'AUDITORIO A',
        'CP01',
        'INFORMATICA',
        '202012345',
        'PEREZ LOPEZ JUAN',
        '12345678',
        'SI',
      ],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const result = parsePadronExcelBuffer(buffer);
    expect(result.rows).toHaveLength(1);
    expect(result.docentesProcesados).toBe(0);
  });
});
