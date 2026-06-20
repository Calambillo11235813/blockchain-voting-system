import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as XLSX from 'xlsx';

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

const FILA_ESTUDIANTE_EJEMPLO = [
  '01',
  'CIENCIAS Y TECNOLOGIA',
  'L01',
  'AUDITORIO CENTRAL',
  'CP01',
  'INGENIERIA INFORMATICA',
  '202012345',
  'PEREZ LOPEZ JUAN CARLOS',
  '12345678',
  'SI',
];

const FILA_DOCENTE_EJEMPLO = [
  '02',
  'INGENIERIA',
  'L02',
  'SALON MAGISTRAL B',
  '90001',
  'RODRIGUEZ MARTINEZ ANA MARIA',
  '87654321',
  'NO',
];

function main(): void {
  const wb = XLSX.utils.book_new();

  const wsEst = XLSX.utils.aoa_to_sheet([
    HEADER_ESTUDIANTES,
    FILA_ESTUDIANTE_EJEMPLO,
  ]);
  XLSX.utils.book_append_sheet(wb, wsEst, 'Estudiantes');

  const wsDoc = XLSX.utils.aoa_to_sheet([
    HEADER_DOCENTES,
    FILA_DOCENTE_EJEMPLO,
  ]);
  XLSX.utils.book_append_sheet(wb, wsDoc, 'Docentes');

  const docsDir = resolve(process.cwd(), 'docs');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = resolve(docsDir, 'plantilla-padron-ejemplo.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`Plantilla generada: ${outputPath}`);
}

main();
