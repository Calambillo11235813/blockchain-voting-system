import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { ApiResponse } from '../../compartido/respuesta';

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
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
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
   *   1. Valida que la fecha de la elección coincida con la fecha actual.
   *   2. Valida que el horario esté dentro de la ventana permitida (08:00–16:00).
   *   3. Activa `estaActiva = true`, habilitando la recepción de votos.
   *
   * - CERRAR:
   *   1. Puede forzarse en cualquier momento (cierre de emergencia).
   *   2. Desactiva `estaActiva = false`, impidiendo nuevos sufragios.
   *   3. Marca la elección como finalizada para habilitar el escrutinio.
   *
   * @param eleccionId  UUID de la elección.
   * @param accion      'ABRIR' o 'CERRAR'.
   * @returns Estado actualizado de la jornada electoral.
   * @throws NotFoundException si la elección no existe.
   * @throws BadRequestException si la acción no es válida en el estado actual
   *         (ej. abrir una elección que ya está activa).
   * @throws ForbiddenException si el horario no permite la apertura.
   */
  async controlarEstadoJornada(
    eleccionId: string,
    accion: AccionJornada,
  ): Promise<ApiResponse<EstadoJornada>> {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }
}
