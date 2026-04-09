import { BadRequestException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
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
   * Busca un estudiante por su CI.
   * @param ci Carnet de identidad del estudiante.
   * @returns Estudiante encontrado o null.
   */
  async buscarEstudiantePorCi(ci: string): Promise<Estudiante | null> {
    const normalized = String(ci || '').trim();
    if (normalized.length === 0) {
      return null;
    }

    return this.estudianteRepository.findOne({ where: { ci: normalized } });
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

    const normalizedRows = rows.map(row => ({
      ...row,
      registro: row.registro.trim(),
      nombres: row.nombres.trim(),
      apellidos: row.apellidos.trim(),
      ci: row.ci.trim(),
      correo: row.correo.trim().toLowerCase(),
      carrera: row.carrera.trim(),
    }));

    const registros = Array.from(new Set(normalizedRows.map(row => row.registro)));
    const cis = Array.from(new Set(normalizedRows.map(row => row.ci)));
    const correos = Array.from(new Set(normalizedRows.map(row => row.correo)));

    let inserted = 0;
    let updated = 0;

    await this.estudianteRepository.manager.transaction(async manager => {
      const repo = manager.getRepository(Estudiante);

      // Regla principal: el identificador para actualizar es el registro.
      // Si existe el registro, se actualiza; si no existe, se inserta.
      const existingByRegistro = registros.length > 0
        ? new Map(
          (await repo
            .createQueryBuilder('estudiante')
            .where('estudiante.registro IN (:...registros)', { registros })
            .getMany())
            .map(item => [item.registro, item])
        )
        : new Map<string, Estudiante>();

      for (const row of normalizedRows) {
        if (existingByRegistro.has(row.registro)) {
          updated += 1;
        } else {
          inserted += 1;
        }
      }

      // Validación previa: evitar que un registro intente tomar un CI/correo que ya pertenece a otro registro.
      if (cis.length > 0 || correos.length > 0) {
        const existingByCiOrCorreo = await repo
          .createQueryBuilder('estudiante')
          .select(['estudiante.id', 'estudiante.registro', 'estudiante.ci', 'estudiante.correo'])
          .where(cis.length > 0 ? 'estudiante.ci IN (:...cis)' : '1=0', { cis })
          .orWhere(correos.length > 0 ? 'LOWER(estudiante.correo) IN (:...correos)' : '1=0', { correos })
          .getMany();

        const byCi = new Map(existingByCiOrCorreo.map(item => [item.ci, item]));
        const byCorreo = new Map(existingByCiOrCorreo.map(item => [String(item.correo || '').toLowerCase(), item]));

        const conflicts: string[] = [];
        for (const row of normalizedRows) {
          const otherByCi = byCi.get(row.ci);
          if (otherByCi && otherByCi.registro !== row.registro) {
            conflicts.push(`Fila ${row.__rowNumber}: el CI '${row.ci}' ya pertenece al registro '${otherByCi.registro}'.`);
          }

          const otherByCorreo = byCorreo.get(row.correo);
          if (otherByCorreo && otherByCorreo.registro !== row.registro) {
            conflicts.push(`Fila ${row.__rowNumber}: el correo '${row.correo}' ya pertenece al registro '${otherByCorreo.registro}'.`);
          }
        }

        if (conflicts.length > 0) {
          throw new BadRequestException(
            `No se puede actualizar porque hay datos que ya pertenecen a otro estudiante:\n${conflicts.map(item => `- ${item}`).join('\n')}`
          );
        }
      }

      const entities = normalizedRows.map(row => {
        const { __rowNumber: _, ...rowData } = row;
        return repo.create(rowData);
      });

      try {
        // Upsert por registro: re-subir el mismo padron actualiza cambios.
        await repo.upsert(entities, {
          conflictPaths: ['registro'],
          skipUpdateIfNoValuesChanged: false,
        });
      } catch (error: unknown) {
        const { code, detail } = this.obtenerDetalleErrorPostgres(error);

        if (code === '23505') {
          const match = /Key \(([^)]+)\)=\(([^)]+)\) already exists\./i.exec(String(detail));
          if (match) {
            const field = match[1];
            const value = match[2];
            throw new BadRequestException(`Ya existe un estudiante con ${field} '${value}'.`);
          }

          throw new BadRequestException('Ya existe un estudiante con datos duplicados (registro, CI o correo).');
        }

        throw error;
      }
    });

    return createApiResponse(
      HttpStatus.OK,
      {
        total: normalizedRows.length,
        inserted,
        updated,
        errors
      },
      'Padron cargado correctamente'
    );
  }

  /**
   * Extrae de forma segura el codigo y detalle de un error de Postgres.
   * @param error Error capturado.
   * @returns Objeto con el codigo y el detalle (si existen).
   */
  private obtenerDetalleErrorPostgres(error: unknown): { code?: string; detail?: string } {
    if (typeof error !== 'object' || error === null) {
      return {};
    }

    const errorRecord = error as Record<string, unknown>;
    const driverError = errorRecord['driverError'];
    const driverRecord = (typeof driverError === 'object' && driverError !== null)
      ? (driverError as Record<string, unknown>)
      : undefined;

    const code = (driverRecord && typeof driverRecord['code'] === 'string')
      ? (driverRecord['code'] as string)
      : (typeof errorRecord['code'] === 'string' ? (errorRecord['code'] as string) : undefined);

    const detail = (driverRecord && typeof driverRecord['detail'] === 'string')
      ? (driverRecord['detail'] as string)
      : (typeof errorRecord['detail'] === 'string' ? (errorRecord['detail'] as string) : undefined);

    return { code, detail };
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
