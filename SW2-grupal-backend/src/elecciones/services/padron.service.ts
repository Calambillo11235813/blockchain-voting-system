import { BadRequestException, ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { Eleccion } from '../entities/eleccion.entity';
import { RegistroSufragio } from '../entities/registro-sufragio.entity';
import { Elector, EstamentoEnum } from '../../electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';

// ─── Interfaces internas de parsing ───────────────────────────────────────────

/** Fila normalizada tras el parsing del archivo Excel. */
interface ElectorExcelRow {
  registro: string;
  ci: string;
  nombre: string;
  apellido: string;
  estamento: EstamentoEnum;
  carrera: string;
}

/** Fila parseada con metadatos de trazabilidad. */
interface ElectorExcelParsedRow extends ElectorExcelRow {
  /** Número de fila original en el Excel (para mensajes de error). */
  __rowNumber: number;
}

// ─── Interfaces de resultado ──────────────────────────────────────────────────

/** Estadísticas devueltas tras la carga masiva del padrón electoral. */
export interface ResultadoCargaPadron {
  totalProcesado: number;
  electoresInsertados: number;
  electoresActualizados: number;
  registrosHabilitados: number;
  erroresEstructurales: string[];
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * Servicio dedicado a la gestión del padrón electoral (whitelist)
 * y la validación de acceso del votante.
 *
 * Repositorios inyectados: PadronElectoral, Elector.
 */
@Injectable()
export class PadronService {
  /**
   * Cabeceras admitidas en el archivo Excel.
   * Se acepta tanto la forma singular como la plural para nombre/apellido.
   */
  private static readonly HEADER_ALIASES: Record<string, string> = {
    registro: 'registro',
    ci: 'ci',
    nombre: 'nombre',
    nombres: 'nombre',
    apellido: 'apellido',
    apellidos: 'apellido',
    estamento: 'estamento',
    carrera: 'carrera',
  };

  /** Columnas obligatorias después de la normalización de aliases. */
  private static readonly REQUIRED_COLUMNS = ['registro', 'ci', 'nombre', 'apellido', 'carrera'];

  constructor(
    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    private readonly dataSource: DataSource,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF1 — CARGA MASIVA DEL PADRÓN ELECTORAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF1 · Carga masiva del padrón electoral desde un archivo Excel (.xlsx).
   *
   * Ejecuta toda la operación en una única transacción atómica:
   *   Fase A → Upsert masivo en el catálogo global `electores`.
   *   Fase B → Vinculación al padrón `padron_electoral` de la elección.
   *
   * @param eleccionId  UUID de la elección destino.
   * @param archivo     Buffer binario del archivo .xlsx.
   * @returns Estadísticas de la carga masiva.
   * @throws NotFoundException si la elección no existe.
   * @throws BadRequestException si el archivo no cumple el formato esperado.
   */
  async cargarPadronElectoral(
    eleccionId: string,
    archivo: Buffer,
  ): Promise<ApiResponse<ResultadoCargaPadron>> {
    // ── 0. Validar existencia de la elección ──────────────────────────────
    const eleccion = await this.dataSource.getRepository(Eleccion).findOne({
      where: { id: eleccionId },
    });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}`);
    }

    // ── 1. Parsing y validación estructural ───────────────────────────────
    const { rows, errors: erroresEstructurales } = this.parseExcelBuffer(archivo);

    if (rows.length === 0) {
      throw new BadRequestException(
        erroresEstructurales.length > 0
          ? `El archivo no contiene filas válidas:\n${erroresEstructurales.map(e => `- ${e}`).join('\n')}`
          : 'El archivo no contiene filas válidas.',
      );
    }

    // ── 2. Validar duplicados internos del archivo ────────────────────────
    const duplicateErrors = this.validateNoDuplicates(rows);
    if (duplicateErrors.length > 0) {
      throw new BadRequestException(
        `El archivo contiene filas duplicadas:\n${duplicateErrors.map(e => `- ${e}`).join('\n')}`,
      );
    }

    // ── 3. Normalizar datos ───────────────────────────────────────────────
    const normalizedRows = rows.map(row => ({
      ...row,
      registro: row.registro.trim(),
      ci: row.ci.trim(),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      carrera: row.carrera.trim(),
    }));

    // ── 4. Ejecutar transacción atómica ───────────────────────────────────
    let electoresInsertados = 0;
    let electoresActualizados = 0;
    let registrosHabilitados = 0;

    await this.dataSource.transaction(async manager => {
      const electorRepo = manager.getRepository(Elector);
      const padronRepo = manager.getRepository(PadronElectoral);

      // ═══════════════════════════════════════════════════════════════════
      //  FASE A — Gestión del catálogo global (Elector)
      // ═══════════════════════════════════════════════════════════════════

      const registrosUnicos = [...new Set(normalizedRows.map(r => r.registro))];
      const cisUnicos = [...new Set(normalizedRows.map(r => r.ci))];

      // A.1 — Consultar electores existentes por registro (para contar inserts vs updates)
      const existentesPorRegistro = registrosUnicos.length > 0
        ? new Map(
          (await electorRepo
            .createQueryBuilder('e')
            .where('e.registro IN (:...registros)', { registros: registrosUnicos })
            .getMany()
          ).map(e => [e.registro, e]),
        )
        : new Map<string, Elector>();

      // A.2 — Validar colisiones cruzadas CI ↔ Registro
      //   Evitar que un registro intente tomar un CI que ya pertenece a otro elector.
      if (cisUnicos.length > 0) {
        const existentesPorCi = await electorRepo
          .createQueryBuilder('e')
          .select(['e.id', 'e.registro', 'e.ci'])
          .where('e.ci IN (:...cis)', { cis: cisUnicos })
          .getMany();

        const byCi = new Map(existentesPorCi.map(e => [e.ci, e]));

        const conflicts: string[] = [];
        for (const row of normalizedRows) {
          const otroPorCi = byCi.get(row.ci);
          if (otroPorCi && otroPorCi.registro !== row.registro) {
            conflicts.push(
              `Fila ${row.__rowNumber}: el CI '${row.ci}' ya pertenece al registro '${otroPorCi.registro}'.`,
            );
          }
        }

        if (conflicts.length > 0) {
          throw new BadRequestException(
            `No se puede procesar porque hay datos que ya pertenecen a otro elector:\n${conflicts.map(c => `- ${c}`).join('\n')}`,
          );
        }
      }

      // A.3 — Contar inserciones vs actualizaciones
      for (const row of normalizedRows) {
        if (existentesPorRegistro.has(row.registro)) {
          electoresActualizados += 1;
        } else {
          electoresInsertados += 1;
        }
      }

      // A.4 — Upsert masivo en tabla `electores` por registro
      const electorEntities = normalizedRows.map(row => {
        const { __rowNumber: _, ...data } = row;
        return electorRepo.create(data);
      });

      try {
        await electorRepo.upsert(electorEntities, {
          conflictPaths: ['registro'],
          skipUpdateIfNoValuesChanged: false,
        });
      } catch (error: unknown) {
        const { code, detail } = this.obtenerDetalleErrorPostgres(error);

        if (code === '23505') {
          const match = /Key \(([^)]+)\)=\(([^)]+)\) already exists\./i.exec(String(detail));
          if (match) {
            throw new BadRequestException(
              `Ya existe un elector con ${match[1]} '${match[2]}'.`,
            );
          }
          throw new BadRequestException(
            'Ya existe un elector con datos duplicados (registro o CI).',
          );
        }

        throw error;
      }

      // ═══════════════════════════════════════════════════════════════════
      //  FASE B — Vinculación a la Elección (PadronElectoral)
      // ═══════════════════════════════════════════════════════════════════

      // B.1 — Recuperar los UUIDs reales de la BD para los registros procesados
      const electoresDb = await electorRepo.find({
        where: { registro: In(registrosUnicos) },
        select: ['id', 'registro'],
      });

      const mapaRegistroId = new Map(electoresDb.map(e => [e.registro, e.id]));

      // B.2 — Construir entidades de PadronElectoral
      const padronEntities: PadronElectoral[] = [];
      for (const row of normalizedRows) {
        const dbElectorId = mapaRegistroId.get(row.registro);
        if (!dbElectorId) {
          // Caso defensivo: no debería ocurrir tras el upsert exitoso.
          continue;
        }

        const entry = padronRepo.create({
          eleccion: { id: eleccionId } as Eleccion,
          elector: { id: dbElectorId } as Elector,
          estaHabilitado: true,
        });
        padronEntities.push(entry);
      }

      // B.3 — Upsert masivo en padron_electoral por constraint compuesto
      if (padronEntities.length > 0) {
        await padronRepo.upsert(padronEntities, {
          conflictPaths: ['eleccion', 'elector'],
          skipUpdateIfNoValuesChanged: false,
        });
      }

      registrosHabilitados = padronEntities.length;
    });

    // ── 5. Retornar estadísticas ──────────────────────────────────────────
    return createApiResponse(
      HttpStatus.OK,
      {
        totalProcesado: normalizedRows.length,
        electoresInsertados,
        electoresActualizados,
        registrosHabilitados,
        erroresEstructurales,
      },
      'Padrón electoral cargado correctamente.',
    );
  }

  /**
   * RF1 · Lista los electores del padrón de una elección con paginación.
   *
   * @param eleccionId  UUID de la elección.
   * @param page        Número de página (1-indexed, default 1).
   * @param limit       Registros por página (default 50).
   * @returns Lista paginada de registros del padrón con datos del elector.
   */
  async listarPadronElectoral(
    eleccionId: string,
    page: number = 1,
    limit: number = 50,
    estamento?: string,
  ): Promise<ApiResponse<PadronElectoral[]>> {
    const eleccion = await this.dataSource.getRepository(Eleccion).findOne({
      where: { id: eleccionId },
    });

    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}`);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = { eleccion: { id: eleccionId } };
    if (estamento) {
      whereClause.elector = { estamento };
    }

    const [items, total] = await this.padronElectoralRepository.findAndCount({
      where: whereClause,
      relations: ['elector'],
      order: {
        elector: { apellido: 'ASC', nombre: 'ASC' },
      },
      skip,
      take: limit,
    });

    return createApiResponse(
      HttpStatus.OK,
      items,
      'Padrón listado correctamente.',
      undefined,
      {
        total,
        page,
        limit,
      }
    );
  }

  /**
   * RF1 · Habilita o deshabilita un elector individual dentro del padrón
   * de una elección específica (toggle booleano).
   *
   * @param eleccionId  UUID de la elección.
   * @param electorId   UUID del elector a modificar.
   * @returns Registro del padrón actualizado.
   * @throws NotFoundException si la combinación elección-elector no existe.
   */
  async toggleHabilitacionElector(
    eleccionId: string,
    electorId: string,
  ): Promise<ApiResponse<PadronElectoral>> {
    throw new Error('Not implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF6 — VALIDACIÓN DE ACCESO DEL VOTANTE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF6 · Verifica que un elector está habilitado en el padrón de la
   * elección activa y puede ejercer su derecho al voto.
   *
   * Validaciones:
   * 1. El elector existe en el sistema (búsqueda por registro universitario).
   * 2. El elector pertenece al padrón de la elección indicada.
   * 3. El elector está habilitado (`estaHabilitado = true`).
   * 4. El elector no ha votado previamente (sin RegistroSufragio existente).
   *
   * @param registro    Número de registro universitario del elector.
   * @param eleccionId  UUID de la elección activa.
   * @returns Datos del elector si pasa todas las validaciones.
   * @throws NotFoundException si el elector no existe o no está en el padrón.
   * @throws ForbiddenException si no está habilitado o ya votó.
   */
  async validarAccesoVotante(
    registro: string,
    eleccionId: string,
  ): Promise<ApiResponse<Elector>> {
    // ── Validación 1: Existencia global del elector ───────────────────────
    // Busca al elector en el catálogo maestro por su número de registro.
    // Si no existe en absoluto, no tiene sentido continuar las demás validaciones.
    const elector = await this.electorRepository.findOne({
      where: { registro },
    });

    if (!elector) {
      throw new NotFoundException(
        `No se encontró ningún elector con el registro '${registro}'.`,
      );
    }

    // ── Validación 2: Pertenencia al padrón de la elección ────────────────
    // Verifica que el elector fue cargado en la whitelist de ESTA elección
    // específica. Un elector puede existir en el catálogo global pero no
    // estar habilitado para el comicio en curso.
    const entradaPadron = await this.padronElectoralRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: elector.id },
      },
      relations: ['eleccion', 'elector'],
    });

    if (!entradaPadron) {
      throw new NotFoundException(
        `El elector con registro '${registro}' no está inscrito en el padrón de esta elección.`,
      );
    }

    // ── Validación 3: Estado de habilitación ──────────────────────────────
    // El administrador puede revocar individualmente la habilitación de un
    // elector antes de que inicie la jornada (ej. bajas, errores de carga).
    if (!entradaPadron.estaHabilitado) {
      throw new ForbiddenException(
        `El elector con registro '${registro}' ha sido inhabilitado para esta elección.`,
      );
    }

    // ── Validación 4: Doble voto (Removido) ────────────────────────────────
    // Ya no bloqueamos el login si el elector ya votó, para permitir que 
    // el frontend lo redirija al panel de estadísticas y descarga de certificado.
    // La protección contra doble voto se mantiene firmemente en voto.service.ts.

    // ── Acceso concedido ─────────────────────────────────────────────────
    return createApiResponse(
      HttpStatus.OK,
      elector,
      `Elector '${registro}' habilitado para votar.`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS — PARSING EXCEL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parsea un buffer Excel y valida cabeceras y filas.
   * Acepta variaciones en los nombres de columnas (nombre/nombres, apellido/apellidos).
   *
   * @param buffer  Buffer del archivo .xlsx.
   * @returns Filas válidas y lista de errores estructurales.
   * @throws BadRequestException si el archivo está vacío o no tiene cabeceras reconocibles.
   */
  private parseExcelBuffer(buffer: Buffer): { rows: ElectorExcelParsedRow[]; errors: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('El archivo no contiene hojas.');
    }

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (raw.length === 0) {
      throw new BadRequestException('El archivo no contiene cabeceras.');
    }

    // ── Normalizar cabeceras con aliases ──────────────────────────────────
    const headerRow = (raw[0] as Array<unknown>).map(cell =>
      String(cell).trim().toLowerCase(),
    );

    const columnMap = new Map<string, number>();
    for (let i = 0; i < headerRow.length; i++) {
      const alias = PadronService.HEADER_ALIASES[headerRow[i]];
      if (alias && !columnMap.has(alias)) {
        columnMap.set(alias, i);
      }
    }

    // Validar que todas las columnas obligatorias estén presentes
    const missingHeaders = PadronService.REQUIRED_COLUMNS.filter(col => !columnMap.has(col));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Cabeceras faltantes o no reconocidas: ${missingHeaders.join(', ')}. ` +
        `Se aceptan: ${Object.keys(PadronService.HEADER_ALIASES).join(', ')}.`,
      );
    }

    // ── Parsear filas ────────────────────────────────────────────────────
    const errors: string[] = [];
    const rows: ElectorExcelParsedRow[] = [];

    for (let i = 1; i < raw.length; i++) {
      const rawRow = raw[i] as Array<unknown>;

      const getValue = (col: string): string =>
        String(rawRow[columnMap.get(col)!] ?? '').trim();

      const registro = getValue('registro');
      const ci = getValue('ci');
      const nombre = getValue('nombre');
      const apellido = getValue('apellido');
      const carrera = getValue('carrera');

      // Saltar filas completamente vacías
      const hasAnyValue = [registro, ci, nombre, apellido, carrera].some(v => v.length > 0);
      if (!hasAnyValue) {
        continue;
      }

      // Validar campos obligatorios
      const missing: string[] = [];
      if (!registro) missing.push('registro');
      if (!ci) missing.push('ci');
      if (!nombre) missing.push('nombre');
      if (!apellido) missing.push('apellido');
      if (!carrera) missing.push('carrera');

      if (missing.length > 0) {
        errors.push(`Fila ${i + 1}: faltan ${missing.join(', ')}`);
        continue;
      }

      // Gestión de estamento: leer del Excel o asumir ESTUDIANTE por defecto
      let estamento = EstamentoEnum.ESTUDIANTE;
      if (columnMap.has('estamento')) {
        const rawEstamento = getValue('estamento').toUpperCase();
        if (rawEstamento === 'DOCENTE') {
          estamento = EstamentoEnum.DOCENTE;
        } else if (rawEstamento && rawEstamento !== 'ESTUDIANTE') {
          errors.push(`Fila ${i + 1}: estamento '${rawEstamento}' no reconocido (usar ESTUDIANTE o DOCENTE)`);
          continue;
        }
      }

      rows.push({
        registro,
        ci,
        nombre,
        apellido,
        estamento,
        carrera,
        __rowNumber: i + 1,
      });
    }

    return { rows, errors };
  }

  /**
   * Valida que no existan duplicados internos en el archivo Excel
   * para los campos de unicidad (registro, ci).
   *
   * @param rows  Filas parseadas del archivo.
   * @returns Lista de mensajes de error por duplicados encontrados.
   */
  private validateNoDuplicates(rows: ElectorExcelParsedRow[]): string[] {
    const errors: string[] = [];

    const byRegistro = new Map<string, number[]>();
    const byCi = new Map<string, number[]>();

    for (const row of rows) {
      const reg = row.registro;
      const ci = row.ci;

      if (!byRegistro.has(reg)) byRegistro.set(reg, []);
      byRegistro.get(reg)!.push(row.__rowNumber);

      if (!byCi.has(ci)) byCi.set(ci, []);
      byCi.get(ci)!.push(row.__rowNumber);
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

    return errors;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS — UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrae de forma segura el código y detalle de un error nativo de PostgreSQL.
   * Navega tanto el error directo como el `driverError` encapsulado por TypeORM.
   *
   * @param error  Error capturado en el bloque catch.
   * @returns Objeto con el código y el detalle (si existen).
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
}
