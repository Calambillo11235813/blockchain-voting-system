import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/autenticacion/services/auth.service';
import { LoginDTO } from 'src/autenticacion/dto/login.dto';
import { LoginAdminDto } from 'src/autenticacion/dto/login-admin.dto';
import { ApiResponse } from 'src/compartido/respuesta';
import { AuthResponse } from 'src/autenticacion/interfaces/auth.interface';
import { ElectionGuard } from '../guards/election.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Login de estudiante (HU-002).
   * @param loginDTO registro y password.
   * @returns Token JWT.
   * @throws UnauthorizedException si las credenciales no son válidas.
   */
  @Post('login')
  @UseGuards(ElectionGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDTO: LoginDTO,
  ) {
    const result = await this.authService.loginElector(loginDTO.registro, loginDTO.password, loginDTO.eleccionId);
    return {
      statusCode: HttpStatus.OK,
      message: "Inicio de sesión exitoso",
      data: result
    };
  }

  /**
   * Login de administrador (Corte Electoral).
   * @param loginAdminDto correo y password.
   * @returns Token JWT con rol ADMIN.
   * @throws UnauthorizedException si las credenciales no son válidas.
   */
  @Post('login-admin')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(
    @Body() loginAdminDto: LoginAdminDto,
  ): Promise<ApiResponse<AuthResponse>> {
    return await this.authService.loginAdministrador(loginAdminDto);
  }

  /**
   * Compatibilidad temporal: endpoint heredado de plantilla SaaS.
   * Recomendado eliminar cuando el frontend use /auth/login.
   */
  @Post('login-saas')
  @HttpCode(HttpStatus.OK)
  async loginSaaS(
    @Body() loginDTO: LoginDTO,
  ) {
    const result = await this.authService.loginElector(loginDTO.registro, loginDTO.password, loginDTO.eleccionId);
    return {
      statusCode: HttpStatus.OK,
      message: "Inicio de sesión exitoso",
      data: result
    };
  }

  // Estos métodos están comentados en el servicio, así que los comentaré aquí también

  // @Patch('update-password')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Actualizar contraseña de acceso al tenant' })
  // async updatePassword(
  //   @Body() updatePasswordDTO: UpdateMemberDto, 
  //   @GetUser() user: UserPayload,
  //   @GetTenant() tenant: string,
  // ): Promise<CustomApiResponse<any>> {
  //   return this.authService.updatePassword(updatePasswordDTO, user.userId, tenant);
  // }

  // @Post('switch-tenant/:tenantId')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Cambiar de tenant sin requerir contraseña' })
  // async switchTenant(
  //   @GetUser() user: UserPayload,
  //   @Param('tenantId') tenantId: string,
  // ): Promise<CustomApiResponse<any>> {
  //   return this.authService.switchTenant(user.userId, tenantId);
  // }
}
