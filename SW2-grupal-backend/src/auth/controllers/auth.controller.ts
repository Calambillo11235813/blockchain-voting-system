import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDTO } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login-saas')
  @HttpCode(HttpStatus.OK)
  async loginSaaS(
    @Body() loginDTO: LoginDTO,
  ) {
    return this.authService.loginSaaS(loginDTO);
  }

  @Post('login-tenant')
  @HttpCode(HttpStatus.OK)
  async loginTenant(
    @Body() loginDTO: LoginDTO,
  ) {
    return this.authService.loginService(loginDTO);
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