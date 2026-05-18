import { BadRequestException, ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { CrearEleccionDto } from '../dto/eleccion/crear-eleccion.dto';
import { ActualizarEleccionDto } from '../dto/eleccion/actualizar-eleccion.dto';

/**
 * Servicio del dominio de elecciones facultativas.
 */
@Injectable()
export class EleccionesLegacyService {
  private static readonly VOTING_START_HOUR = 8;
  private static readonly VOTING_END_HOUR = 16;

  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
  ) {}

  /**
   * Crea una nueva eleccion facultativa.
   * @param crearEleccionDto Datos de la eleccion.
   * @returns Eleccion creada.
   * @throws BadRequestException Si la fecha no es valida.
   */
  async crearEleccion(crearEleccionDto: CrearEleccionDto): Promise<ApiResponse<Eleccion>> {
    const fecha = this.parseElectionDate(crearEleccionDto.fecha);

    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha de la eleccion no es valida.');
    }


    const eleccion = this.eleccionRepository.create({
      titulo: crearEleccionDto.titulo,
      gestion: crearEleccionDto.gestion,
      fecha,
      restriccionAlfabeticaActiva: crearEleccionDto.restriccionAlfabeticaActiva ?? true,
      estaActiva: crearEleccionDto.estaActiva,
    });

    const guardada = await this.eleccionRepository.save(eleccion);
    return createApiResponse(HttpStatus.CREATED, guardada, 'Eleccion creada correctamente.');
  }

  /**
   * Lista todas las elecciones.
   * @returns Lista de elecciones.
   */
  async listarElecciones(): Promise<ApiResponse<Eleccion[]>> {
    const elecciones = await this.eleccionRepository.find({
      order: { gestion: 'DESC', fecha: 'DESC' },
    });

    return createApiResponse(HttpStatus.OK, elecciones, 'Elecciones listadas correctamente.');
  }

  /**
   * Obtiene una eleccion por su identificador.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion encontrada.
   * @throws NotFoundException Si la eleccion no existe.
   */
  async obtenerEleccionPorId(eleccionId: string): Promise<ApiResponse<Eleccion>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);
    return createApiResponse(HttpStatus.OK, eleccion, 'Eleccion obtenida correctamente.');
  }

  /**
   * Actualiza una eleccion existente.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param actualizarEleccionDto Campos a actualizar.
   * @returns Eleccion actualizada.
   * @throws NotFoundException Si la eleccion no existe.
   * @throws BadRequestException Si las fechas son inconsistentes.
   */
  async actualizarEleccion(
    eleccionId: string,
    actualizarEleccionDto: ActualizarEleccionDto,
  ): Promise<ApiResponse<Eleccion>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    const nuevaFecha = actualizarEleccionDto.fecha
      ? this.parseElectionDate(actualizarEleccionDto.fecha)
      : this.parseElectionDate(eleccion.fecha as unknown as Date);
    if (Number.isNaN(nuevaFecha.getTime())) {
      throw new BadRequestException('La fecha de la eleccion no es valida.');
    }

    eleccion.titulo = actualizarEleccionDto.titulo ?? eleccion.titulo;
    eleccion.gestion = actualizarEleccionDto.gestion ?? eleccion.gestion;
    eleccion.fecha = nuevaFecha;
    eleccion.restriccionAlfabeticaActiva =
      actualizarEleccionDto.restriccionAlfabeticaActiva ?? eleccion.restriccionAlfabeticaActiva;
    eleccion.estaActiva = actualizarEleccionDto.estaActiva ?? eleccion.estaActiva;

    const actualizada = await this.eleccionRepository.save(eleccion);
    return createApiResponse(HttpStatus.OK, actualizada, 'Eleccion actualizada correctamente.');
  }

  /**
   * Elimina una eleccion.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Resultado de eliminacion.
   * @throws NotFoundException Si la eleccion no existe.
   */
  async eliminarEleccion(eleccionId: string): Promise<ApiResponse<null>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);
    await this.eleccionRepository.remove(eleccion);
    return createApiResponse(HttpStatus.OK, null, 'Eleccion eliminada correctamente.');
  }

  /**
   * Obtiene la elección activa que corresponde al día indicado.
   * Si no existe para hoy pero BYPASS_ELECTION_TIME=true, devuelve la primera activa.
   * Si no existe ninguna, retorna null.
   */
  async obtenerEleccionActivaDelDia(fechaReferencia: Date = new Date()): Promise<Eleccion | null> {
    const activas = await this.eleccionRepository.find({
      where: { estaActiva: true },
      order: { fecha: 'DESC' },
    });

    if (activas.length === 0) {
      return null;
    }

    if (process.env.BYPASS_ELECTION_TIME === 'true') {
      return activas[0]; // Retorna la elección activa más reciente sin importar su fecha
    }

    const ref = new Date(fechaReferencia);
    const refY = ref.getFullYear();
    const refM = ref.getMonth();
    const refD = ref.getDate();

    for (const eleccion of activas) {
      const f = this.parseElectionDate(eleccion.fecha as unknown as Date);
      if (f.getFullYear() === refY && f.getMonth() === refM && f.getDate() === refD) {
        return eleccion;
      }
    }

    return null;
  }

  /**
   * Calcula el horario asignado para un votante según la inicial de su apellido.
   * Jornada fija: 08:00–16:00 (8 slots de 1 hora).
   */
  obtenerVentanaAsignadaPorApellido(
    fechaEleccion: Date,
    apellido: string,
  ): { inicio: Date; fin: Date; desde: string; hasta: string } {
    const initial = this.obtenerInicialApellido(apellido);
    const slotIndex = this.obtenerSlotIndexPorInicial(initial);
    const { inicio: inicioJornada } = this.obtenerVentanaVotacion(fechaEleccion);

    const inicio = new Date(inicioJornada.getTime() + slotIndex * 60 * 60 * 1000);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
    const rango = this.obtenerRangoAlfabeticoPorSlot(slotIndex);
    return { inicio, fin, desde: rango.desde, hasta: rango.hasta };
  }

  /**
   * Activa o desactiva la restricción alfabética (interruptor maestro).
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion actualizada.
   */
  async toggleRestriccionAlfabetica(eleccionId: string): Promise<ApiResponse<Eleccion>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);
    eleccion.restriccionAlfabeticaActiva = !eleccion.restriccionAlfabeticaActiva;
    const actualizada = await this.eleccionRepository.save(eleccion);
    return createApiResponse(HttpStatus.OK, actualizada, 'Restriccion alfabetica actualizada correctamente.');
  }

  /**
   * Valida si un estudiante puede votar en una elección según:
   * - Ventana de votación del día (08:00 a 16:00).
   * - Interruptor maestro de restricción alfabética.
   * - Rango alfabético asignado a cada hora.
   *
   * @param apellido Primer apellido del estudiante.
   * @param eleccionId Identificador UUID de la eleccion.
   * @throws ForbiddenException Si está fuera de horario o fuera de su rango.
   */
  async validarAccesoVotante(apellido: string, eleccionId: string): Promise<void> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    if (!eleccion.estaActiva) {
      throw new ForbiddenException({
        status: 'NOT_STARTED',
        message: 'La eleccion no está activa.'
      });
    }

    if (process.env.BYPASS_ELECTION_TIME === 'true') {
      return; // Salto manual de restricciones para entorno de desarrollo
    }

    const now = new Date();
    const { inicio, fin } = this.obtenerVentanaVotacion(eleccion.fecha);

    if (now < inicio) {
      throw new ForbiddenException({
        status: 'NOT_STARTED',
        message: 'La elección aún no ha comenzado en el día de hoy.'
      });
    }

    if (now >= fin) {
      throw new ForbiddenException({
        status: 'FINISHED',
        message: 'La elección ya ha finalizado por el día de hoy.'
      });
    }

    if (!eleccion.restriccionAlfabeticaActiva) {
      return;
    }

    const initial = this.obtenerInicialApellido(apellido);

    const slotIndex = Math.floor((now.getTime() - inicio.getTime()) / (60 * 60 * 1000));
    const slot = this.obtenerRangoAlfabeticoPorSlot(slotIndex);

    if (!slot.letras.includes(initial)) {
      const assignedSlot = this.obtenerVentanaAsignadaPorApellido(eleccion.fecha as unknown as Date, apellido);
      throw new ForbiddenException({
        status: 'WRONG_ALPHABETICAL_SLOT',
        message: `Aún no es tu turno. Tu apellido inicia con "${initial}". En este horario pueden votar apellidos entre "${slot.desde}" y "${slot.hasta}".`,
        assignedSlot
      });
    }
  }


  /**
   * Busca una eleccion por su ID o lanza excepcion.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion encontrada.
   * @throws NotFoundException Si no existe.
   */
  private async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    return eleccion;
  }

  /**
   * Calcula el rango horario de votación para una fecha.
   * @param fecha Fecha de la elección.
   * @returns Inicio y fin (fin exclusivo).
   */
  private obtenerVentanaVotacion(fecha: Date): { inicio: Date; fin: Date } {
    const base = this.parseElectionDate(fecha);
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = base.getDate();

    const inicio = new Date(year, month, day, EleccionesLegacyService.VOTING_START_HOUR, 0, 0, 0);
    const fin = new Date(year, month, day, EleccionesLegacyService.VOTING_END_HOUR, 0, 0, 0);
    return { inicio, fin };
  }

  /**
   * Exposición pública del rango horario del día de votación.
   * Útil para validaciones en login sin duplicar lógica.
   */
  obtenerVentanaVotacionDelDia(fechaEleccion: Date): { inicio: Date; fin: Date } {
    return this.obtenerVentanaVotacion(fechaEleccion);
  }

  /**
   * Obtiene inicial A-Z del primer apellido.
   * @param apellido Primer apellido del estudiante.
   * @returns Letra A-Z.
   */
  private obtenerInicialApellido(apellido: string): string {
    const normalized = String(apellido || '').trim();
    if (!normalized) {
      throw new BadRequestException('El apellido es requerido para validar acceso.');
    }

    const firstChar = normalized
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace('Ñ', 'N')
      .charAt(0);

    if (!/^[A-Z]$/.test(firstChar)) {
      throw new BadRequestException('El apellido no tiene una inicial válida (A-Z).');
    }

    return firstChar;
  }

  /**
   * Convierte una fecha de elección a un Date consistente.
   * - Si llega como `YYYY-MM-DD`, se interpreta como hora local 00:00 para evitar desfase por zona horaria.
   * - Si llega como ISO (`YYYY-MM-DDTHH:mm:ss...`), se parsea normal.
   */
  private parseElectionDate(value: string | Date): Date {
    if (value instanceof Date) {
      return new Date(value);
    }

    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00`);
    }

    return new Date(raw);
  }

  /**
   * Divide A-Z en 8 slots lo más uniforme posible.
   * - 26 letras / 8 slots => 2 slots de 4 letras y 6 slots de 3 letras.
   * - Slots: A-D, E-H, I-K, L-N, O-Q, R-T, U-W, X-Z
   *
   * @param slotIndex Indice de 0 a 7.
   */
  private obtenerRangoAlfabeticoPorSlot(slotIndex: number): { desde: string; hasta: string; letras: string[] } {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const slots = 8;
    const baseSize = Math.floor(letters.length / slots); // 3
    const remainder = letters.length % slots; // 2

    if (slotIndex < 0 || slotIndex >= slots) {
      // Si llegara aquí, significa que el horario está fuera del rango esperado.
      return { desde: 'A', hasta: 'Z', letras: letters };
    }

    let start = 0;
    for (let i = 0; i < slotIndex; i++) {
      start += baseSize + (i < remainder ? 1 : 0);
    }
    const size = baseSize + (slotIndex < remainder ? 1 : 0);
    const group = letters.slice(start, start + size);
    return {
      desde: group[0],
      hasta: group[group.length - 1],
      letras: group,
    };
  }

  private obtenerSlotIndexPorInicial(initial: string): number {
    for (let i = 0; i < 8; i++) {
      const slot = this.obtenerRangoAlfabeticoPorSlot(i);
      if (slot.letras.includes(initial)) {
        return i;
      }
    }
    return 0;
  }

}
