import { BadRequestException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import * as XLSX from 'xlsx';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { Estudiante } from './entities/estudiante.entity';

interface EstudianteExcelRow {
  registro: string;
  nombres: string;
  apellidos: string;
  ci: string;
  correo: string;
  carrera: string;
}

interface EstudianteExcelParsedRow extends EstudianteExcelRow {
  __rowNumber: number;
}

@Injectable()
export class EstudiantesService {
  private static readonly EXPECTED_HEADERS = [
    'registro',
    'nombres',
    'apellidos',
    'ci',
    'correo',
    'carrera'
  ];

  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>
  ) { }

  /**
   * Busca un estudiante por su registro.
   * @param registro Registro del estudiante.
   * @returns Estudiante encontrado o null.
   */
  async buscarEstudiantePorRegistro(registro: string): Promise<Estudiante | null> {
    const normalized = String(registro || '').trim();
    if (normalized.length === 0) {
      return null;
    }

    return this.estudianteRepository.findOne({ where: { registro: normalized } });
  }

  /**
   * Carga el padron de estudiantes desde un archivo Excel en memoria.
   * @param buffer Buffer del archivo .xlsx.
   * @returns Resultado de la carga con conteos y errores.
   * @throws BadRequestException si el archivo no cumple el formato esperado.
   */
  async cargarPadronDesdeExcel(buffer: Buffer): Promise<ApiResponse<{ total: number; inserted: number; updated: number; errors: string[] }>> {
    const { rows, errors } = this.parseExcelBuffer(buffer);

    if (rows.length === 0) {
      throw new BadRequestException('El archivo no contiene filas validas');
    }

    const duplicateErrors = this.validateNoDuplicates(rows);
    if (duplicateErrors.length > 0) {
      throw new BadRequestException(
        `El archivo contiene filas duplicadas:\n${duplicateErrors.map(item => `- ${item}`).join('\n')}`
      );
    }

    const registros = Array.from(new Set(rows.map(row => row.registro)));
    const cis = Array.from(new Set(rows.map(row => row.ci)));

    const where: Array<FindOptionsWhere<Estudiante>> = [];
    if (registros.length > 0) {
      where.push({ registro: In(registros) });
    }
    if (cis.length > 0) {
      where.push({ ci: In(cis) });
    }

    const existing = where.length > 0
      ? await this.estudianteRepository.find({ where })
      : [];

    const existingByRegistro = new Map(existing.map(item => [item.registro, item]));
    const existingByCi = new Map(existing.map(item => [item.ci, item]));

    let inserted = 0;
    let updated = 0;

    const entities: Estudiante[] = rows.map(row => {
      const { __rowNumber: _, ...rowData } = row;
      const match = existingByRegistro.get(rowData.registro) || existingByCi.get(rowData.ci);
      if (match) {
        updated += 1;
        return this.estudianteRepository.create({
          id: match.id,
          ...rowData
        });
      }

      inserted += 1;
      return this.estudianteRepository.create(rowData);
    });

    await this.estudianteRepository.save(entities, { chunk: 200 });

    return createApiResponse(
      HttpStatus.OK,
      {
        total: rows.length,
        inserted,
        updated,
        errors
      },
      'Padron cargado correctamente'
    );
  }

  /**
   * Parsea un buffer Excel y valida cabeceras y filas.
   * @param buffer Buffer del archivo .xlsx.
   * @returns Filas validas y lista de errores.
   * @throws BadRequestException si las cabeceras no coinciden.
   */
  private parseExcelBuffer(buffer: Buffer): { rows: EstudianteExcelParsedRow[]; errors: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('El archivo no contiene hojas');
    }

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (raw.length === 0) {
      throw new BadRequestException('El archivo no contiene cabeceras');
    }

    const headerRow = (raw[0] as Array<unknown>).map(cell => String(cell).trim().toLowerCase());
    const expected = EstudiantesService.EXPECTED_HEADERS;

    const headersMatch = headerRow.length === expected.length && headerRow.every((value, index) => value === expected[index]);
    if (!headersMatch) {
      throw new BadRequestException(`Cabeceras invalidas. Se esperan: ${expected.join(', ')}`);
    }

    const errors: string[] = [];
    const rows: EstudianteExcelParsedRow[] = [];

    for (let i = 1; i < raw.length; i += 1) {
      const row = raw[i] as Array<unknown>;
      const rowData: EstudianteExcelRow = {
        registro: String(row[0] ?? '').trim(),
        nombres: String(row[1] ?? '').trim(),
        apellidos: String(row[2] ?? '').trim(),
        ci: String(row[3] ?? '').trim(),
        correo: String(row[4] ?? '').trim(),
        carrera: String(row[5] ?? '').trim()
      };

      const hasAnyValue = Object.values(rowData).some(value => value.length > 0);
      if (!hasAnyValue) {
        continue;
      }

      const missing = Object.entries(rowData)
        .filter(([, value]) => value.length === 0)
        .map(([key]) => key);

      if (missing.length > 0) {
        errors.push(`Fila ${i + 1}: faltan ${missing.join(', ')}`);
        continue;
      }

      rows.push({
        ...rowData,
        __rowNumber: i + 1,
      });
    }

    return { rows, errors };
  }

  private validateNoDuplicates(rows: EstudianteExcelParsedRow[]): string[] {
    const errors: string[] = [];

    const byRegistro = new Map<string, number[]>();
    const byCi = new Map<string, number[]>();
    const byCorreo = new Map<string, number[]>();

    for (const row of rows) {
      const registro = row.registro.trim();
      const ci = row.ci.trim();
      const correo = row.correo.trim().toLowerCase();

      if (!byRegistro.has(registro)) byRegistro.set(registro, []);
      byRegistro.get(registro)!.push(row.__rowNumber);

      if (!byCi.has(ci)) byCi.set(ci, []);
      byCi.get(ci)!.push(row.__rowNumber);

      if (!byCorreo.has(correo)) byCorreo.set(correo, []);
      byCorreo.get(correo)!.push(row.__rowNumber);
    }

    const collect = (label: string, map: Map<string, number[]>) => {
      for (const [value, rowNumbers] of map.entries()) {
        if (rowNumbers.length > 1) {
          const sorted = rowNumbers.slice().sort((a, b) => a - b);
          errors.push(`${label} '${value}' repetido en filas ${sorted.join(', ')}`);
        }
      }
    };

    collect('registro', byRegistro);
    collect('ci', byCi);
    collect('correo', byCorreo);

    return errors;
  }
}
