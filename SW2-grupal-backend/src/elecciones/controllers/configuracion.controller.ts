import {
  Body,
  Controller,
  Delete,
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

  @Get()
  async listar(): Promise<ApiResponse<any>> {
    const listado = await this.configuracionService.obtenerTodos();
    return createApiResponse(
      HttpStatus.OK,
      listado,
      'Listado de parámetros obtenido correctamente.',
    );
  }

  @Get(':clave')
  async obtener(@Param('clave') clave: string): Promise<ApiResponse<any>> {
    const valor = await this.configuracionService.obtenerValor(clave);
    return createApiResponse(HttpStatus.OK, { clave, valor }, 'Valor obtenido');
  }

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
    return createApiResponse(HttpStatus.OK, parametro, 'Parámetro actualizado');
  }

  @Delete(':clave')
  async eliminar(@Param('clave') clave: string): Promise<ApiResponse<any>> {
    await this.configuracionService.eliminarParametro(clave);
    return createApiResponse(HttpStatus.OK, null, 'Parámetro eliminado');
  }
}
