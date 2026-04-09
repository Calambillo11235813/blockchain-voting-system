import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { CrearFrenteDto } from 'src/elecciones/dto/frente/crear-frente.dto';
import { ActualizarFrenteDto } from 'src/elecciones/dto/frente/actualizar-frente.dto';
import { Cargo } from 'src/elecciones/entities/cargo.entity';

/**
 * Servicio de aplicacion para el dominio de frentes.
 */
@Injectable()
export class FrenteService {
  constructor(
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(Cargo)
    private readonly cargoRepository: Repository<Cargo>,
  ) {}

  /**
   * Crea un frente.
   * @param crearFrenteDto Datos del frente.
   * @returns Frente creado.
   */
  async crearFrente(crearFrenteDto: CrearFrenteDto): Promise<ApiResponse<Frente>> {
    const cargo = await this.buscarCargoPorIdOrThrow(crearFrenteDto.cargoId);

    const frente = this.frenteRepository.create({
      nombreFrente: crearFrenteDto.nombreFrente,
      sigla: crearFrenteDto.sigla,
      logoUrl: crearFrenteDto.logoUrl ?? null,
      cargo,
    });

    const guardado = await this.frenteRepository.save(frente);
    return createApiResponse(HttpStatus.CREATED, guardado, 'Frente creado correctamente.');
  }

  /**
   * Lista todos los frentes.
   * @returns Lista de frentes.
   */
  async listarFrentes(): Promise<ApiResponse<Frente[]>> {
    const frentes = await this.frenteRepository.find({
      relations: { cargo: true },
      order: { nombreFrente: 'ASC' },
    });

    return createApiResponse(HttpStatus.OK, frentes, 'Frentes listados correctamente.');
  }

  /**
   * Obtiene un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @returns Frente encontrado.
   */
  async obtenerFrentePorId(frenteId: string): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    return createApiResponse(HttpStatus.OK, frente, 'Frente obtenido correctamente.');
  }

  /**
   * Actualiza un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @param actualizarFrenteDto Campos a actualizar.
   * @returns Frente actualizado.
   */
  async actualizarFrente(
    frenteId: string,
    actualizarFrenteDto: ActualizarFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);

    if (actualizarFrenteDto.cargoId) {
      frente.cargo = await this.buscarCargoPorIdOrThrow(actualizarFrenteDto.cargoId);
    }

    frente.nombreFrente = actualizarFrenteDto.nombreFrente ?? frente.nombreFrente;
    frente.sigla = actualizarFrenteDto.sigla ?? frente.sigla;
    frente.logoUrl = actualizarFrenteDto.logoUrl ?? frente.logoUrl;

    const actualizado = await this.frenteRepository.save(frente);
    return createApiResponse(HttpStatus.OK, actualizado, 'Frente actualizado correctamente.');
  }

  /**
   * Elimina un frente por ID.
   * @param frenteId Identificador UUID del frente.
   * @returns Resultado de eliminacion.
   */
  async eliminarFrente(frenteId: string): Promise<ApiResponse<null>> {
    const frente = await this.buscarFrentePorIdOrThrow(frenteId);
    await this.frenteRepository.remove(frente);
    return createApiResponse(HttpStatus.OK, null, 'Frente eliminado correctamente.');
  }

  /**
   * Busca un cargo por ID o lanza excepcion.
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   * @throws NotFoundException Si el cargo no existe.
   */
  private async buscarCargoPorIdOrThrow(cargoId: string): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({ where: { id: cargoId } });

    if (!cargo) {
      throw new NotFoundException(`No se encontro el cargo con id ${cargoId}`);
    }

    return cargo;
  }

  /**
   * Busca un frente por ID o lanza excepcion.
   * @param frenteId Identificador UUID del frente.
   * @returns Frente encontrado.
   * @throws NotFoundException Si el frente no existe.
   */
  private async buscarFrentePorIdOrThrow(frenteId: string): Promise<Frente> {
    const frente = await this.frenteRepository.findOne({
      where: { id: frenteId },
      relations: { cargo: true },
    });

    if (!frente) {
      throw new NotFoundException(`No se encontro el frente con id ${frenteId}`);
    }

    return frente;
  }
}
