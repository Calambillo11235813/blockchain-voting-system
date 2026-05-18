import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Cargo } from 'src/elecciones/entities/cargo.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { CrearCargoDto } from 'src/elecciones/dto/cargo/crear-cargo.dto';
import { ActualizarCargoDto } from 'src/elecciones/dto/cargo/actualizar-cargo.dto';

/**
 * Servicio de aplicacion para el dominio de cargos (Catálogo Maestro).
 *
 * Responsabilidades:
 * - CRUD del catálogo global de Cargos.
 * - Vinculación automática Cargo ↔ Elección (EleccionCargo) cuando se
 *   proporciona `eleccionId` en la creación o actualización.
 */
@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private readonly cargoRepository: Repository<Cargo>,

    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea un cargo en el catálogo maestro.
   * Si se proporciona `eleccionId`, vincula el cargo a esa elección
   * creando el registro `EleccionCargo` dentro de una transacción atómica.
   *
   * @param crearCargoDto Datos del cargo con `eleccionId` opcional.
   * @returns Cargo creado.
   * @throws NotFoundException Si la elección indicada no existe.
   */
  async crearCargo(crearCargoDto: CrearCargoDto): Promise<ApiResponse<Cargo>> {
    const { nombre, facultad, eleccionId } = crearCargoDto;

    const guardado = await this.dataSource.transaction(async (manager) => {
      const cargoRepo = manager.getRepository(Cargo);
      const eleccionCargoRepo = manager.getRepository(EleccionCargo);

      // Paso 1 — Crear y persistir el Cargo en el catálogo maestro
      const cargo = cargoRepo.create({ nombre, facultad });
      const cargoPersistido = await cargoRepo.save(cargo);

      // Paso 2 — Si viene eleccionId, crear la vinculación Cargo ↔ Elección
      if (eleccionId) {
        const eleccionExiste = await manager
          .getRepository(Eleccion)
          .findOne({ where: { id: eleccionId } });

        if (!eleccionExiste) {
          throw new NotFoundException(
            `No se encontró la elección con id ${eleccionId}.`,
          );
        }

        const eleccionCargo = eleccionCargoRepo.create({
          cargo: { id: cargoPersistido.id } as Cargo,
          eleccion: { id: eleccionId } as Eleccion,
        });
        await eleccionCargoRepo.save(eleccionCargo);
      }

      return cargoPersistido;
    });

    return createApiResponse(HttpStatus.CREATED, guardado, 'Cargo creado correctamente.');
  }

  /**
   * Lista todos los cargos, incluyendo la elección a la que pertenecen.
   * La respuesta incluye `eleccion` directamente en cada cargo para que el
   * frontend pueda leer `position.eleccion.id` sin navegar el array.
   *
   * @returns Lista de cargos con su elección asociada.
   */
  async listarCargos(): Promise<ApiResponse<any[]>> {
    const cargos = await this.cargoRepository.find({
      order: { nombre: 'ASC' },
      relations: ['eleccionCargos', 'eleccionCargos.eleccion'],
    });

    // Aplanar la relación: el frontend espera `cargo.eleccion` (objeto directo),
    // no `cargo.eleccionCargos[]`. Tomamos el primer vínculo si existe.
    const result = cargos.map((cargo) => {
      const { eleccionCargos, ...rest } = cargo as any;
      const primeraVinculacion = eleccionCargos?.[0];
      return {
        ...rest,
        eleccion: primeraVinculacion?.eleccion ?? null,
        eleccionCargoId: primeraVinculacion?.id ?? null,
      };
    });

    return createApiResponse(HttpStatus.OK, result, 'Cargos listados correctamente.');
  }

  /**
   * Obtiene un cargo por su identificador UUID.
   *
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   * @throws NotFoundException Si el cargo no existe.
   */
  async obtenerCargoPorId(cargoId: string): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    return createApiResponse(HttpStatus.OK, cargo, 'Cargo obtenido correctamente.');
  }

  /**
   * Actualiza un cargo por su identificador UUID.
   * Si se proporciona `eleccionId`, crea o reutiliza la vinculación EleccionCargo.
   *
   * @param cargoId Identificador UUID del cargo.
   * @param actualizarCargoDto Campos a actualizar.
   * @returns Cargo actualizado.
   * @throws NotFoundException Si el cargo o la elección no existen.
   */
  async actualizarCargo(
    cargoId: string,
    actualizarCargoDto: ActualizarCargoDto,
  ): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);

    cargo.nombre = actualizarCargoDto.nombre ?? cargo.nombre;
    cargo.facultad = actualizarCargoDto.facultad ?? cargo.facultad;

    const actualizado = await this.cargoRepository.save(cargo);
    return createApiResponse(HttpStatus.OK, actualizado, 'Cargo actualizado correctamente.');
  }

  /**
   * Elimina un cargo del catálogo maestro por su identificador UUID.
   *
   * @param cargoId Identificador UUID del cargo.
   * @returns Resultado de eliminación.
   * @throws NotFoundException Si el cargo no existe.
   */
  async eliminarCargo(cargoId: string): Promise<ApiResponse<null>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    await this.cargoRepository.remove(cargo);
    return createApiResponse(HttpStatus.OK, null, 'Cargo eliminado correctamente.');
  }

  // ─── MÉTODOS PRIVADOS ────────────────────────────────────────────────────────

  /**
   * Busca un cargo por ID o lanza NotFoundException.
   *
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   * @throws NotFoundException Si el cargo no existe.
   */
  private async buscarCargoPorIdOrThrow(cargoId: string): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({
      where: { id: cargoId },
    });

    if (!cargo) {
      throw new NotFoundException(`No se encontro el cargo con id ${cargoId}`);
    }

    return cargo;
  }
}

