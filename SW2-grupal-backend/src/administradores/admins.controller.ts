import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';
import { AdminsService } from './admins.service';
import { ActualizarPerfilAdminDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordAdminDto } from './dto/cambiar-password.dto';
import { CrearAdministradorDto } from './dto/crear-administrador.dto';
import { SistemasGuard } from './guards/sistemas.guard';
import { createApiResponse, ApiResponse } from 'src/compartido/respuesta';

@Controller('admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  /**
   * Obtiene el perfil del administrador autenticado actualmente.
   */
  @Get('perfil')
  async obtenerPerfil(@Req() req: any): Promise<ApiResponse<any>> {
    const adminId = req.user.id;
    const perfil = await this.adminsService.obtenerPerfil(adminId);
    return createApiResponse(
      HttpStatus.OK,
      perfil,
      'Perfil del administrador obtenido correctamente.',
    );
  }

  /**
   * Actualiza los datos editables del perfil del administrador autenticado.
   */
  @Patch('perfil')
  async actualizarPerfil(
    @Req() req: any,
    @Body() dto: ActualizarPerfilAdminDto,
  ): Promise<ApiResponse<any>> {
    const adminId = req.user.id;
    const perfil = await this.adminsService.actualizarPerfil(adminId, dto);
    return createApiResponse(
      HttpStatus.OK,
      perfil,
      'Perfil del administrador actualizado correctamente.',
    );
  }

  /**
   * Cambia la contraseña del administrador autenticado.
   */
  @Patch('password')
  async cambiarPassword(
    @Req() req: any,
    @Body() dto: CambiarPasswordAdminDto,
  ): Promise<ApiResponse<null>> {
    const adminId = req.user.id;
    await this.adminsService.cambiarPassword(adminId, dto);
    return createApiResponse(
      HttpStatus.OK,
      null,
      'Contraseña cambiada correctamente.',
    );
  }

  /**
   * Lista todos los administradores registrados.
   * Solo accesible por administradores con rol de SISTEMAS.
   */
  @Get()
  @UseGuards(SistemasGuard)
  async listarAdministradores(): Promise<ApiResponse<any[]>> {
    const listado = await this.adminsService.listarAdministradores();
    return createApiResponse(
      HttpStatus.OK,
      listado,
      'Listado de administradores obtenido correctamente.',
    );
  }

  /**
   * Crea un nuevo administrador.
   * Solo accesible por administradores con rol de SISTEMAS.
   */
  @Post()
  @UseGuards(SistemasGuard)
  async crearAdministrador(
    @Body() dto: CrearAdministradorDto,
  ): Promise<ApiResponse<any>> {
    const admin = await this.adminsService.crearAdministradorDesdeDto(dto);
    return createApiResponse(
      HttpStatus.OK,
      admin,
      'Administrador creado correctamente.',
    );
  }

  /**
   * Elimina un administrador por su ID.
   * Solo accesible por administradores con rol de SISTEMAS.
   */
  @Delete(':id')
  @UseGuards(SistemasGuard)
  async eliminarAdministrador(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.adminsService.eliminarAdministrador(id);
    return createApiResponse(
      HttpStatus.OK,
      null,
      'Administrador eliminado correctamente.',
    );
  }
}
