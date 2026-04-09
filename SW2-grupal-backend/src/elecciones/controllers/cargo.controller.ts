import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CargoService } from 'src/elecciones/services/cargo.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Cargo } from 'src/elecciones/entities/cargo.entity';
import { CrearCargoDto } from 'src/elecciones/dto/cargo/crear-cargo.dto';
import { ActualizarCargoDto } from 'src/elecciones/dto/cargo/actualizar-cargo.dto';

/**
 * Controlador del dominio de cargos.
 */
@Controller('elecciones/cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  /**
   * Crea un cargo.
   * @param crearCargoDto Datos del cargo.
   * @returns Cargo creado.
   */
  @Post()
  async crearCargo(@Body() crearCargoDto: CrearCargoDto): Promise<ApiResponse<Cargo>> {
    return this.cargoService.crearCargo(crearCargoDto);
  }

  /**
   * Lista todos los cargos.
   * @returns Lista de cargos.
   */
  @Get('lista')
  async listarCargos(): Promise<ApiResponse<Cargo[]>> {
    return this.cargoService.listarCargos();
  }

  /**
   * Obtiene un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @returns Cargo encontrado.
   */
  @Get(':cargoId')
  async obtenerCargoPorId(
    @Param('cargoId', ParseUUIDPipe) cargoId: string,
  ): Promise<ApiResponse<Cargo>> {
    return this.cargoService.obtenerCargoPorId(cargoId);
  }

  /**
   * Actualiza un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @param actualizarCargoDto Campos a actualizar.
   * @returns Cargo actualizado.
   */
  @Patch(':cargoId')
  async actualizarCargo(
    @Param('cargoId', ParseUUIDPipe) cargoId: string,
    @Body() actualizarCargoDto: ActualizarCargoDto,
  ): Promise<ApiResponse<Cargo>> {
    return this.cargoService.actualizarCargo(cargoId, actualizarCargoDto);
  }

  /**
   * Elimina un cargo por ID.
   * @param cargoId Identificador UUID del cargo.
   * @returns Resultado de eliminacion.
   */
  @Delete(':cargoId')
  async eliminarCargo(
    @Param('cargoId', ParseUUIDPipe) cargoId: string,
  ): Promise<ApiResponse<null>> {
    return this.cargoService.eliminarCargo(cargoId);
  }
}
