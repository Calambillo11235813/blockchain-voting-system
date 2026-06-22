import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { Cargo } from 'src/elecciones/entities/cargo.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { CrearCargoDto } from 'src/elecciones/dto/cargo/crear-cargo.dto';
import { ActualizarCargoDto } from 'src/elecciones/dto/cargo/actualizar-cargo.dto';
import { AlcancePapeletaEnum } from 'src/elecciones/enums/alcance-papeleta.enum';
import { TipoCargoEnum } from 'src/elecciones/enums/tipo-cargo.enum';
import { EleccionEstadoService } from './eleccion-estado.service';

/**
 * Servicio de aplicacion para el dominio de cargos y papeletas.
 */
@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private readonly cargoRepository: Repository<Cargo>,

    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,

    private readonly dataSource: DataSource,
    private readonly eleccionEstadoService: EleccionEstadoService,
  ) {}

  async crearCargo(crearCargoDto: CrearCargoDto): Promise<ApiResponse<Cargo>> {
    this.validarAlcanceDto(crearCargoDto.alcance, crearCargoDto);
    await this.eleccionEstadoService.assertEnConfiguracion(crearCargoDto.eleccionId);

    const { nombre, facultad, eleccionId, tipoCargo, alcance, orden } = crearCargoDto;

    const guardado = await this.dataSource.transaction(async (manager) => {
      const cargoRepo = manager.getRepository(Cargo);
      const eleccionCargoRepo = manager.getRepository(EleccionCargo);

      const cargo = cargoRepo.create({
        nombre,
        facultad: facultad ?? '',
        tipoCargo: tipoCargo ?? this.inferirTipoCargo(nombre),
      });
      const cargoPersistido = await cargoRepo.save(cargo);

      const eleccionExiste = await manager.getRepository(Eleccion).findOne({ where: { id: eleccionId } });
      if (!eleccionExiste) {
        throw new NotFoundException(`No se encontró la elección con id ${eleccionId}.`);
      }

      const eleccionCargo = eleccionCargoRepo.create({
        cargo: { id: cargoPersistido.id } as Cargo,
        eleccion: { id: eleccionId } as Eleccion,
        alcance,
        codFacultad: crearCargoDto.codFacultad ?? null,
        facultadNombre: crearCargoDto.facultadNombre ?? null,
        codCarrera: crearCargoDto.codCarrera ?? null,
        carreraNombre: crearCargoDto.carreraNombre ?? null,
        orden: orden ?? 0,
        estaActiva: true,
      });
      await eleccionCargoRepo.save(eleccionCargo);

      return cargoPersistido;
    });

    return createApiResponse(HttpStatus.CREATED, guardado, 'Cargo y papeleta creados correctamente.');
  }

  async listarCargos(): Promise<ApiResponse<any[]>> {
    const cargos = await this.cargoRepository.find({
      order: { nombre: 'ASC' },
      relations: ['eleccionCargos', 'eleccionCargos.eleccion'],
    });

    const result = cargos.map((cargo) => {
      const { eleccionCargos, ...rest } = cargo as any;
      const primeraVinculacion = eleccionCargos?.[0];
      return {
        ...rest,
        eleccion: primeraVinculacion?.eleccion ?? null,
        eleccionCargoId: primeraVinculacion?.id ?? null,
        alcance: primeraVinculacion?.alcance ?? AlcancePapeletaEnum.GLOBAL,
        codFacultad: primeraVinculacion?.codFacultad ?? null,
        facultadNombre: primeraVinculacion?.facultadNombre ?? null,
        codCarrera: primeraVinculacion?.codCarrera ?? null,
        carreraNombre: primeraVinculacion?.carreraNombre ?? null,
        orden: primeraVinculacion?.orden ?? 0,
        estaActiva: primeraVinculacion?.estaActiva ?? true,
      };
    });

    return createApiResponse(HttpStatus.OK, result, 'Cargos listados correctamente.');
  }

  async obtenerCargoPorId(cargoId: string): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    return createApiResponse(HttpStatus.OK, cargo, 'Cargo obtenido correctamente.');
  }

  async actualizarCargo(
    cargoId: string,
    actualizarCargoDto: ActualizarCargoDto,
  ): Promise<ApiResponse<Cargo>> {
    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    const eleccionId = await this.obtenerEleccionIdPorCargo(cargoId);
    if (eleccionId) {
      await this.eleccionEstadoService.assertEnConfiguracion(eleccionId);
    }

    cargo.nombre = actualizarCargoDto.nombre ?? cargo.nombre;
    cargo.facultad = actualizarCargoDto.facultad ?? cargo.facultad;
    if (actualizarCargoDto.tipoCargo) {
      cargo.tipoCargo = actualizarCargoDto.tipoCargo;
    }

    const actualizado = await this.cargoRepository.save(cargo);
    return createApiResponse(HttpStatus.OK, actualizado, 'Cargo actualizado correctamente.');
  }

  async eliminarCargo(cargoId: string): Promise<ApiResponse<null>> {
    const eleccionId = await this.obtenerEleccionIdPorCargo(cargoId);
    if (eleccionId) {
      await this.eleccionEstadoService.assertEnConfiguracion(eleccionId);
    }

    const cargo = await this.buscarCargoPorIdOrThrow(cargoId);
    await this.cargoRepository.remove(cargo);
    return createApiResponse(HttpStatus.OK, null, 'Cargo eliminado correctamente.');
  }

  private validarAlcanceDto(alcance: AlcancePapeletaEnum, dto: CrearCargoDto): void {
    if (alcance === AlcancePapeletaEnum.GLOBAL) {
      return;
    }

    if (!dto.codFacultad?.trim()) {
      throw new BadRequestException('codFacultad es obligatorio para alcance FACULTAD o CARRERA.');
    }

    if (alcance === AlcancePapeletaEnum.CARRERA && !dto.codCarrera?.trim()) {
      throw new BadRequestException('codCarrera es obligatorio para alcance CARRERA.');
    }
  }

  private inferirTipoCargo(nombre: string): TipoCargoEnum {
    const upper = nombre.trim().toUpperCase();
    if (upper.includes('DIRECTOR')) return TipoCargoEnum.DIRECTOR_CARRERA;
    if (upper.includes('RECTOR')) return TipoCargoEnum.RECTOR;
    if (upper.includes('DECANO')) return TipoCargoEnum.DECANO;
    return TipoCargoEnum.OTRO;
  }

  private async buscarCargoPorIdOrThrow(cargoId: string): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({ where: { id: cargoId } });
    if (!cargo) {
      throw new NotFoundException(`No se encontro el cargo con id ${cargoId}`);
    }
    return cargo;
  }

  private async obtenerEleccionIdPorCargo(cargoId: string): Promise<string | null> {
    const eleccionCargo = await this.eleccionCargoRepository.findOne({
      where: { cargo: { id: cargoId } },
      relations: { eleccion: true },
    });

    return eleccionCargo?.eleccion?.id ?? null;
  }
}
