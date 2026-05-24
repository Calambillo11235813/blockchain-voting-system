import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { ConfiguracionService } from './configuracion.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Acción de control sobre el estado operativo de la jornada. */
export type AccionJornada = 'ABRIR' | 'CERRAR';

/** Información del estado actual de la jornada electoral. */
export interface EstadoJornada {
  eleccionId: string;
  titulo: string;
  estaActiva: boolean;
  fecha: Date;
  accionEjecutada: AccionJornada;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * Servicio dedicado al control del estado operativo de la jornada electoral.
 * Gestiona la apertura y cierre de una elección en base a horarios.
 *
 * Repositorio inyectado: Eleccion.
 */
@Injectable()
export class JornadaService {
  private static readonly VOTING_START_HOUR = 8;
  private static readonly VOTING_END_HOUR = 16;

  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF5 — CONTROL DE APERTURA Y CIERRE DE JORNADA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF5 · Gestiona la apertura y cierre operativo de la jornada electoral
   * en base a horarios configurados.
   *
   * Reglas de negocio:
   * - ABRIR:
   *   1. Valida que la elección NO esté ya activa.
   *   2. Valida que la fecha de la elección coincida con la fecha actual.
   *   3. Valida que el horario esté dentro de la ventana permitida (08:00–16:00).
   *   4. Activa `estaActiva = true`, habilitando la recepción de votos.
   *
   * - CERRAR:
   *   1. Valida que la elección esté activa.
   *   2. Puede forzarse en cualquier momento (cierre de emergencia).
   *   3. Desactiva `estaActiva = false`, impidiendo nuevos sufragios.
   *
   * Si la variable de entorno `BYPASS_ELECTION_TIME === 'true'`, se omiten
   * las validaciones de fecha y hora (útil para desarrollo).
   *
   * @param eleccionId  UUID de la elección.
   * @param accion      'ABRIR' o 'CERRAR'.
   * @returns Estado actualizado de la jornada electoral.
   * @throws NotFoundException si la elección no existe.
   * @throws BadRequestException si la acción no es válida en el estado actual.
   * @throws ForbiddenException si el horario no permite la apertura.
   */
  async controlarEstadoJornada(
    eleccionId: string,
    accion: AccionJornada,
  ): Promise<ApiResponse<EstadoJornada>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);
    const bypass =
      (await this.configuracionService.obtenerValor('BYPASS_ELECTION_TIME')) === true ||
      process.env.BYPASS_ELECTION_TIME === 'true';

    if (accion === 'ABRIR') {
      // Validación 1: La jornada no debe estar ya abierta
      if (eleccion.estaActiva) {
        throw new BadRequestException('La jornada ya está abierta.');
      }

      if (!bypass) {
        const ahora = new Date();
        const fechaEleccion = this.parseElectionDate(eleccion.fecha as unknown as string | Date);

        // Validación 2: La fecha de la elección debe coincidir con hoy
        if (!this.isSameDay(fechaEleccion, ahora)) {
          throw new ForbiddenException(
            'Solo se puede abrir la jornada el día de la elección.',
          );
        }

        // Validación 3: La hora actual debe estar dentro del rango 08:00–16:00
        const horaActual = ahora.getHours();
        if (
          horaActual < JornadaService.VOTING_START_HOUR ||
          horaActual >= JornadaService.VOTING_END_HOUR
        ) {
          throw new ForbiddenException(
            'No se puede abrir la jornada fuera del horario permitido (08:00-16:00).',
          );
        }
      }

      // Abrir jornada
      eleccion.estaActiva = true;
      await this.eleccionRepository.save(eleccion);

      return createApiResponse(
        HttpStatus.OK,
        this.buildEstadoJornada(eleccion, 'ABRIR'),
        'Jornada electoral abierta correctamente.',
      );
    }

    if (accion === 'CERRAR') {
      // Validación: La jornada debe estar activa para poder cerrarla
      if (!eleccion.estaActiva) {
        throw new BadRequestException('La jornada ya está cerrada.');
      }

      // Cerrar jornada (puede forzarse en cualquier momento)
      eleccion.estaActiva = false;
      await this.eleccionRepository.save(eleccion);

      return createApiResponse(
        HttpStatus.OK,
        this.buildEstadoJornada(eleccion, 'CERRAR'),
        'Jornada electoral cerrada correctamente.',
      );
    }

    // Acción no reconocida
    throw new BadRequestException(
      `Acción '${accion}' no reconocida. Use 'ABRIR' o 'CERRAR'.`,
    );
  }

  /**
   * RF5 · Consulta el estado actual de la jornada de una elección
   * sin modificarlo (lectura).
   *
   * @param eleccionId  UUID de la elección.
   * @returns Estado actual de la jornada (activa/inactiva, fecha, horarios).
   * @throws NotFoundException si la elección no existe.
   */
  async obtenerEstadoJornada(
    eleccionId: string,
  ): Promise<ApiResponse<EstadoJornada>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    // Determinar la "última acción lógica" en base al estado actual
    const accionLogica: AccionJornada = eleccion.estaActiva ? 'ABRIR' : 'CERRAR';

    return createApiResponse(
      HttpStatus.OK,
      this.buildEstadoJornada(eleccion, accionLogica),
      'Estado de la jornada obtenido correctamente.',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca una elección por ID o lanza NotFoundException.
   */
  private async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
    });

    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con id ${eleccionId}.`,
      );
    }

    return eleccion;
  }

  /**
   * Construye el objeto de respuesta EstadoJornada a partir de una entidad Eleccion.
   */
  private buildEstadoJornada(eleccion: Eleccion, accionEjecutada: AccionJornada): EstadoJornada {
    return {
      eleccionId: eleccion.id,
      titulo: eleccion.titulo,
      estaActiva: eleccion.estaActiva,
      fecha: eleccion.fecha as unknown as Date,
      accionEjecutada,
    };
  }

  /**
   * Compara dos fechas ignorando la hora, solo año-mes-día.
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Convierte un valor de fecha a un Date consistente.
   * - Si llega como `YYYY-MM-DD`, se interpreta en hora local (evita desfase UTC).
   * - Si llega como ISO o como Date, se parsea normalmente.
   */
  private parseElectionDate(value: string | Date): Date {
    if (value instanceof Date) {
      return new Date(value);
    }

    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      // Parsear como hora local para evitar desfase de zona horaria
      return new Date(`${raw}T00:00:00`);
    }

    return new Date(raw);
  }
}
