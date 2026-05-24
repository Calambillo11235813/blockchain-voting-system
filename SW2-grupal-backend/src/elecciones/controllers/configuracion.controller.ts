import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from 'src/autenticacion/guards/role.guard';
import { ConfiguracionService } from '../services/configuracion.service';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';

@Controller('admin/configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  /**
   * Obtiene la lista de todos los parámetros de configuración en el sistema.
   */
  @Get()
  async listar(): Promise<ApiResponse<any>> {
    const listado = await this.configuracionService.obtenerTodos();
    return createApiResponse(
      HttpStatus.OK,
      listado,
      'Listado de parámetros de configuración obtenido correctamente.',
    );
  }

  /**
   * Obtiene el valor parseado de un parámetro de configuración por su clave.
   */
  @Get(':clave')
  async obtener(@Param('clave') clave: string): Promise<ApiResponse<any>> {
    const valor = await this.configuracionService.obtenerValor(clave);
    return createApiResponse(
      HttpStatus.OK,
      { clave, valor },
      `Valor del parámetro '${clave}' obtenido correctamente.`,
    );
  }

  /**
   * Crea o actualiza un parámetro de configuración.
   * Invalida la caché del parámetro actualizado.
   */
  @Put(':clave')
  async actualizar(
    @Param('clave') clave: string,
    @Body('valor') valor: string,
    @Body('descripcion') descripcion: string,
    @Req() req,
  ): Promise<ApiResponse<any>> {
    const adminId = req.user?.id || 'sistema-default';
    const parametro = await this.configuracionService.actualizarParametro(
      clave,
      String(valor !== undefined && valor !== null ? valor : ''),
      adminId,
      descripcion,
    );
    return createApiResponse(
      HttpStatus.OK,
      parametro,
      `Parámetro '${clave}' actualizado correctamente en caliente.`,
    );
  }
}
