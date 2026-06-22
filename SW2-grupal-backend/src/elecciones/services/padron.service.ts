import { BadRequestException, ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { Eleccion } from '../entities/eleccion.entity';
import { RegistroSufragio } from '../entities/registro-sufragio.entity';
import { Elector, EstamentoEnum } from '../../electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { parsePadronExcelBuffer } from './padron/padron-excel.parser';
import { FilaPadronNormalizada } from './padron/padron-excel.schemas';
import { validateNoDuplicatesPadron } from './padron/padron-excel.validators';
import { fusionarFilasDualRol } from './padron/padron-excel.merger';
import { EleccionEstadoService } from './eleccion-estado.service';

// ─── Interfaces de resultado ──────────────────────────────────────────────────

/** Estadísticas devueltas tras la carga masiva del padrón electoral. */
export interface ResultadoCargaPadron {
  totalProcesado: number;
  estudiantesProcesados: number;
  docentesProcesados: number;
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
  constructor(
    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    private readonly dataSource: DataSource,
    private readonly eleccionEstadoService: EleccionEstadoService,
  ) { }

  /**
   * Vincula automáticamente el padrón existente a una elección recién creada.
   *
   * Prioridad:
   *   1. Clonar entradas de la elección que tenga más registros en `padron_electoral`.
   *   2. Si no hay padrón previo, inscribir todos los electores del catálogo global.
   *
   * @returns Cantidad de electores vinculados al padrón de la elección.
   */
  async vincularPadronExistenteAEleccion(
    eleccionId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const padronRepo = manager
      ? manager.getRepository(PadronElectoral)
      : this.padronElectoralRepository;
    const electorRepo = manager
      ? manager.getRepository(Elector)
      : this.electorRepository;

    const fuente = await padronRepo
      .createQueryBuilder('p')
      .select('p.eleccionId', 'eleccionId')
      .addSelect('COUNT(*)', 'total')
      .where('p.eleccionId != :eleccionId', { eleccionId })
      .groupBy('p.eleccionId')
      .orderBy('total', 'DESC')
      .limit(1)
      .getRawOne<{ eleccionId: string; total: string }>();

    let padronEntities: PadronElectoral[] = [];

    if (fuente?.eleccionId) {
      const entradasFuente = await padronRepo.find({
        where: { eleccion: { id: fuente.eleccionId } },
        relations: ['elector'],
      });

      padronEntities = entradasFuente.map((entrada) =>
        padronRepo.create({
          eleccion: { id: eleccionId } as Eleccion,
          elector: { id: entrada.elector.id } as Elector,
          estaHabilitado: entrada.estaHabilitado,
          codLugar: entrada.codLugar,
          lugarVotacion: entrada.lugarVotacion,
          habilitadoRector: entrada.habilitadoRector,
        }),
      );
    } else {
      const electores = await electorRepo.find({ select: ['id'] });

      padronEntities = electores.map((elector) =>
        padronRepo.create({
          eleccion: { id: eleccionId } as Eleccion,
          elector: { id: elector.id } as Elector,
          estaHabilitado: true,
          codLugar: null,
          lugarVotacion: null,
          habilitadoRector: false,
        }),
      );
    }

    if (padronEntities.length === 0) {
      return 0;
    }

    await padronRepo.upsert(padronEntities, {
      conflictPaths: ['eleccion', 'elector'],
      skipUpdateIfNoValuesChanged: true,
    });

    return padronEntities.length;
  }

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

    await this.eleccionEstadoService.assertEnConfiguracion(eleccionId);

    // ── 1. Parsing y validación estructural ───────────────────────────────
    const {
      rows,
      errors: erroresEstructurales,
      estudiantesProcesados,
      docentesProcesados,
    } = parsePadronExcelBuffer(archivo);

    if (rows.length === 0) {
      throw new BadRequestException(
        erroresEstructurales.length > 0
          ? `El archivo no contiene filas válidas:\n${erroresEstructurales.map(e => `- ${e}`).join('\n')}`
          : 'El archivo no contiene filas válidas.',
      );
    }

    // ── 2. Validar duplicados internos del archivo ────────────────────────
    const duplicateErrors = validateNoDuplicatesPadron(rows);
    if (duplicateErrors.length > 0) {
      throw new BadRequestException(
        `El archivo contiene filas duplicadas:\n${duplicateErrors.map(e => `- ${e}`).join('\n')}`,
      );
    }

    // ── 2b. Fusionar docentes que también son estudiantes (misma CI) ───────
    const { rows: filasFusionadas, advertencias: advertenciasDualRol } = fusionarFilasDualRol(rows);
    const erroresConAdvertencias = [...erroresEstructurales, ...advertenciasDualRol];

    // ── 3. Normalizar datos ───────────────────────────────────────────────
    const normalizedRows = filasFusionadas.map(row => this.normalizarFila(row));

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

      const registrosUnicos = [
        ...new Set([
          ...normalizedRows.map(r => r.registro),
          ...normalizedRows.flatMap(r => (r.registroDocente ? [r.registroDocente] : [])),
        ]),
      ];
      const cisUnicos = [...new Set(normalizedRows.map(r => r.ci))];

      // A.1 — Consultar electores existentes por registro (para contar inserts vs updates)
      const existentesPorRegistro = new Map<string, Elector>();
      if (registrosUnicos.length > 0) {
        const existentes = await electorRepo
          .createQueryBuilder('e')
          .where('e.registro IN (:...registros)', { registros: registrosUnicos })
          .orWhere('e.registroDocente IN (:...registros)', { registros: registrosUnicos })
          .getMany();

        for (const e of existentes) {
          existentesPorRegistro.set(e.registro, e);
          if (e.registroDocente) {
            existentesPorRegistro.set(e.registroDocente, e);
          }
        }
      }

      // A.2 — Validar colisiones cruzadas CI ↔ Registro
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
              `Hoja ${row.__sheetName}, Fila ${row.__rowNumber}: el CI '${row.ci}' ya pertenece al registro '${otroPorCi.registro}'.`,
            );
          }

          if (row.registroDocente) {
            const otroPorRegistroDocente = existentesPorRegistro.get(row.registroDocente);
            if (otroPorRegistroDocente && otroPorRegistroDocente.ci !== row.ci) {
              conflicts.push(
                `Cod. docente '${row.registroDocente}' ya pertenece a otra persona (CI '${otroPorRegistroDocente.ci}').`,
              );
            }
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
        const entity = electorRepo.create({
          registro: row.registro,
          registroDocente: row.registroDocente ?? null,
          ci: row.ci,
          nombre: row.nombre,
          apellido: row.apellido,
          estamento: row.estamento,
          carrera: row.carrera,
          facultad: row.facultad,
          codFacultad: row.codFacultad,
          codCarrera: row.codCarrera ?? null,
        });
        return entity;
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

      const electoresDb = await electorRepo.find({
        where: { registro: In(registrosUnicos) },
        select: ['id', 'registro'],
      });

      const mapaRegistroId = new Map(electoresDb.map(e => [e.registro, e.id]));

      const padronEntities: PadronElectoral[] = [];
      for (const row of normalizedRows) {
        const dbElectorId = mapaRegistroId.get(row.registro);
        if (!dbElectorId) {
          continue;
        }

        const entry = padronRepo.create({
          eleccion: { id: eleccionId } as Eleccion,
          elector: { id: dbElectorId } as Elector,
          estaHabilitado: true,
          codLugar: row.codLugar,
          lugarVotacion: row.lugarVotacion,
          habilitadoRector: row.habilitadoRector,
        });
        padronEntities.push(entry);
      }

      if (padronEntities.length > 0) {
        await padronRepo.upsert(padronEntities, {
          conflictPaths: ['eleccion', 'elector'],
          skipUpdateIfNoValuesChanged: false,
        });
      }

      registrosHabilitados = padronEntities.length;
    });

    return createApiResponse(
      HttpStatus.OK,
      {
        totalProcesado: normalizedRows.length,
        estudiantesProcesados,
        docentesProcesados,
        electoresInsertados,
        electoresActualizados,
        registrosHabilitados,
        erroresEstructurales: erroresConAdvertencias,
      },
      'Padrón electoral cargado correctamente.',
    );
  }

  /**
   * RF1 · Lista los electores del padrón de una elección con paginación.
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

    const whereClause: Record<string, unknown> = { eleccion: { id: eleccionId } };
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
      },
    );
  }

  /**
   * Catálogo de facultades distintas presentes en el padrón habilitado de una elección.
   * Usado por el admin al configurar papeletas con alcance FACULTAD o CARRERA.
   */
  async obtenerFacultadesDePadron(eleccionId: string): Promise<ApiResponse<Array<{ codFacultad: string; facultadNombre: string }>>> {
    await this.validarEleccionExiste(eleccionId);

    const rows = await this.padronElectoralRepository
      .createQueryBuilder('p')
      .innerJoin('p.elector', 'e')
      .select('e.codFacultad', 'codFacultad')
      .addSelect('MAX(e.facultad)', 'facultadNombre')
      .where('p.eleccionId = :eleccionId', { eleccionId })
      .andWhere('p.estaHabilitado = true')
      .andWhere('e.codFacultad IS NOT NULL')
      .andWhere("TRIM(e.codFacultad) <> ''")
      .groupBy('e.codFacultad')
      .orderBy('MAX(e.facultad)', 'ASC')
      .getRawMany<{ codFacultad: string; facultadNombre: string }>();

    const facultades = rows.map((row) => ({
      codFacultad: String(row.codFacultad).trim(),
      facultadNombre: String(row.facultadNombre ?? row.codFacultad).trim(),
    }));

    return createApiResponse(
      HttpStatus.OK,
      facultades,
      facultades.length > 0
        ? 'Facultades del padrón listadas correctamente.'
        : 'No hay facultades en el padrón. Cargue el padrón Excel primero.',
    );
  }

  /**
   * Catálogo de carreras distintas del padrón habilitado, filtradas por facultad.
   * Solo incluye electores con estamento ESTUDIANTE (docentes no tienen codCarrera).
   */
  async obtenerCarrerasDePadron(
    eleccionId: string,
    codFacultad: string,
  ): Promise<ApiResponse<Array<{ codCarrera: string; carreraNombre: string }>>> {
    await this.validarEleccionExiste(eleccionId);

    const codFacultadNormalizado = codFacultad?.trim();
    if (!codFacultadNormalizado) {
      throw new BadRequestException('El parámetro codFacultad es obligatorio.');
    }

    const rows = await this.padronElectoralRepository
      .createQueryBuilder('p')
      .innerJoin('p.elector', 'e')
      .select('e.codCarrera', 'codCarrera')
      .addSelect('MAX(e.carrera)', 'carreraNombre')
      .where('p.eleccionId = :eleccionId', { eleccionId })
      .andWhere('p.estaHabilitado = true')
      .andWhere('e.codFacultad = :codFacultad', { codFacultad: codFacultadNormalizado })
      .andWhere('e.estamento = :estamento', { estamento: EstamentoEnum.ESTUDIANTE })
      .andWhere('e.codCarrera IS NOT NULL')
      .andWhere("TRIM(e.codCarrera) <> ''")
      .groupBy('e.codCarrera')
      .orderBy('MAX(e.carrera)', 'ASC')
      .getRawMany<{ codCarrera: string; carreraNombre: string }>();

    const carreras = rows.map((row) => ({
      codCarrera: String(row.codCarrera).trim(),
      carreraNombre: String(row.carreraNombre ?? row.codCarrera).trim(),
    }));

    return createApiResponse(
      HttpStatus.OK,
      carreras,
      carreras.length > 0
        ? 'Carreras del padrón listadas correctamente.'
        : 'No hay carreras para la facultad seleccionada en el padrón.',
    );
  }

  /**
   * RF1 · Habilita o deshabilita un elector individual dentro del padrón
   * de una elección específica (toggle booleano).
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

  async validarAccesoVotante(
    registro: string,
    eleccionId: string,
  ): Promise<ApiResponse<Elector>> {
    const elector = await this.electorRepository.findOne({
      where: [{ registro }, { registroDocente: registro }],
    });

    if (!elector) {
      throw new NotFoundException(
        `No se encontró ningún elector con el registro '${registro}'.`,
      );
    }

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

    if (!entradaPadron.estaHabilitado) {
      throw new ForbiddenException(
        `El elector con registro '${registro}' ha sido inhabilitado para esta elección.`,
      );
    }

    return createApiResponse(
      HttpStatus.OK,
      elector,
      `Elector '${registro}' habilitado para votar.`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async validarEleccionExiste(eleccionId: string): Promise<void> {
    const eleccion = await this.dataSource.getRepository(Eleccion).findOne({
      where: { id: eleccionId },
    });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}`);
    }
  }

  private normalizarFila(row: FilaPadronNormalizada): FilaPadronNormalizada {
    return {
      ...row,
      registro: row.registro.trim(),
      ci: row.ci.trim(),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      carrera: row.carrera.trim(),
      facultad: row.facultad.trim(),
      codFacultad: row.codFacultad.trim(),
      codLugar: row.codLugar.trim(),
      lugarVotacion: row.lugarVotacion.trim(),
    };
  }

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
