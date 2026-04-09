import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
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
export class EleccionesService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
  ) {}

  /**
   * Crea una nueva eleccion facultativa.
   * @param crearEleccionDto Datos de la eleccion.
   * @returns Eleccion creada.
   * @throws BadRequestException Si la fecha de inicio es mayor a la fecha de fin.
   */
  async crearEleccion(crearEleccionDto: CrearEleccionDto): Promise<ApiResponse<Eleccion>> {
    const fechaInicio = new Date(crearEleccionDto.fechaInicio);
    const fechaFin = new Date(crearEleccionDto.fechaFin);

    if (fechaInicio > fechaFin) {
      throw new BadRequestException('La fechaInicio no puede ser mayor que fechaFin.');
    }

    const eleccion = this.eleccionRepository.create({
      titulo: crearEleccionDto.titulo,
      gestion: crearEleccionDto.gestion,
      fechaInicio,
      fechaFin,
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
      order: { gestion: 'DESC', fechaInicio: 'DESC' },
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

    const nuevaFechaInicio = actualizarEleccionDto.fechaInicio
      ? new Date(actualizarEleccionDto.fechaInicio)
      : eleccion.fechaInicio;
    const nuevaFechaFin = actualizarEleccionDto.fechaFin
      ? new Date(actualizarEleccionDto.fechaFin)
      : eleccion.fechaFin;

    if (nuevaFechaInicio > nuevaFechaFin) {
      throw new BadRequestException('La fechaInicio no puede ser mayor que fechaFin.');
    }

    eleccion.titulo = actualizarEleccionDto.titulo ?? eleccion.titulo;
    eleccion.gestion = actualizarEleccionDto.gestion ?? eleccion.gestion;
    eleccion.fechaInicio = nuevaFechaInicio;
    eleccion.fechaFin = nuevaFechaFin;
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

}
