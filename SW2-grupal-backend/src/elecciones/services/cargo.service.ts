import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Cargo } from 'src/elecciones/entities/cargo.entity';
import { CrearCargoDto } from 'src/elecciones/dto/cargo/crear-cargo.dto';
import { ActualizarCargoDto } from 'src/elecciones/dto/cargo/actualizar-cargo.dto';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';

/**
 * Servicio de aplicacion para el dominio de cargos.
 */
@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private readonly cargoRepository: Repository<Cargo>,
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
  ) {}

  /**
   * Crea un cargo.
   * @param crearCargoDto Datos del cargo.
   * @returns Cargo creado.
   */
  async crearCargo(crearCargoDto: CrearCargoDto): Promise<ApiResponse<Cargo>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(crearCargoDto.eleccionId);

    const cargo = this.cargoRepository.create({
      nombre: crearCargoDto.nombre,
      facultad: crearCargoDto.facultad,
      eleccion,
    });

    const guardado = await this.cargoRepository.save(cargo);
    return createApiResponse(HttpStatus.CREATED, guardado, 'Cargo creado correctamente.');
  }

  /**
   * Lista todos los cargos.
   * @returns Lista de cargos.
   */
  async listarCargos(): Promise<ApiResponse<Cargo[]>> {
    const cargos = await this.cargoRepository.find({
      relations: { eleccion: true },
      order: { nombre: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, cargos, 'Cargos listados correctamente.');
  }

  /**
   * Obtiene un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   */
  async obtenerCargoPorId(cargoId: string): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    return createApiResponse(HttpStatus.OK, cargo, 'Cargo obtenido correctamente.');
  }

  /**
   * Actualiza un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @param actualizarCargoDto Campos a actualizar.
   * @returns Cargo actualizado.
   */
  async actualizarCargo(
    cargoId: string,
    actualizarCargoDto: ActualizarCargoDto,
  ): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);

    if (actualizarCargoDto.eleccionId) {
      cargo.eleccion = await this.buscarEleccionPorIdOrThrow(actualizarCargoDto.eleccionId);
    }

    cargo.nombre = actualizarCargoDto.nombre ?? cargo.nombre;
    cargo.facultad = actualizarCargoDto.facultad ?? cargo.facultad;

    const actualizado = await this.cargoRepository.save(cargo);
    return createApiResponse(HttpStatus.OK, actualizado, 'Cargo actualizado correctamente.');
  }

  /**
   * Elimina un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @returns Resultado de eliminacion.
   */
  async eliminarCargo(cargoId: string): Promise<ApiResponse<null>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    await this.cargoRepository.remove(cargo);
    return createApiResponse(HttpStatus.OK, null, 'Cargo eliminado correctamente.');
  }

  /**
   * Busca una eleccion por ID o lanza excepcion.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion encontrada.
   * @throws NotFoundException Si la eleccion no existe.
   */
  private async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });

    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    return eleccion;
  }

  /**
   * Busca un cargo por ID o lanza excepcion.
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   * @throws NotFoundException Si el cargo no existe.
   */
  private async buscarCargoPorIdOrThrow(cargoId: string): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({
      where: { id: cargoId },
      relations: { eleccion: true },
    });

    if (!cargo) {
      throw new NotFoundException(`No se encontro el cargo con id ${cargoId}`);
    }

    return cargo;
  }
}
