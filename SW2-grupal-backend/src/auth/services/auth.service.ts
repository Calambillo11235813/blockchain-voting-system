import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { ApiResponse } from 'src/common/interfaces/response.interface';
import { UserService } from 'src/user/services/user.service';
import { LoginDTO } from '../dto/login.dto';
import { AuthResponse, PayloadToken, PayloadTokenTenant } from '../interfaces/auth.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { compare } from 'bcryptjs';


@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,

    @InjectRepository(MemberTenant)
    private readonly memberTenantRepository: Repository<MemberTenant>,
  ) { }


  /**
   * Método para iniciar sesión en el sistema SaaS
   * @param loginDTO Datos de inicio de sesión
   */
  async loginSaaS(loginDTO: LoginDTO): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password } = loginDTO;

      const user = await this.userService.findUser({
        where: [
          email ? { email } : null,
        ]
      });

      if (!user) {
        throw new BadRequestException("Usuario no encontrado");
      }

      const passwordValidate = await compare(
        password,
        user.password
      );

      if (!passwordValidate) {
        throw new BadRequestException("Contraseña incorrecta");
      }

      const payload: PayloadToken = {
        userId: user.id
      };

      const token = this.getToken(payload);

      return {
        statusCode: HttpStatus.OK,
        message: "Inicio de sesión exitoso",
        data: {
          user,
          token
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error del servidor: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Método para iniciar sesión en un tenant específico
   * @param loginDTO Datos de inicio de sesión
   * @param tenantId ID del tenant
   */
  async loginService(loginDTO: LoginDTO): Promise<ApiResponse<AuthResponse>> {
    try {

      const { email, password, tenantId } = loginDTO;

      const user = await this.userService.findUser({
        where: [
          email ? { email } : null,
        ]
      });


      if (!user) {
        throw new BadRequestException("Usuario no encontrado");
      }

      const findUserTenant = await this.memberTenantRepository.findOne({
        where: {
          tenant: { id: tenantId },
          user: { id: user.id }
        },
        relations: [
          'role',
          'role.permissions',
          'role.permissions.permission'
        ]
      });


      if (!findUserTenant) {
        throw new BadRequestException("Usuario no encontrado en el área de trabajo");
      }

      const passwordValidate = await compare(password, findUserTenant.password_tenant);
      if (!passwordValidate) {
        throw new BadRequestException("Contraseña incorrecta");
      }

      const payload: PayloadTokenTenant = {
        userId: user.id,
      };

      const token = this.getToken(payload);

      // const permissions = findUserTenant.role?.permissions?.map(p => ({
      //   id: p.permission.id,
      //   description: p.permission.description,
      //   module: p.permission.groupName
      // })) || [];

      // const roleData = findUserTenant.role ? {
      //   id: findUserTenant.role.id,
      //   name: findUserTenant.role.name,
      //   description: findUserTenant.role.description,
      //   permissions: permissions
      // } : null;

      return {
        statusCode: HttpStatus.OK,
        message: "Inicio de sesión en área de trabajo exitoso",
        data: {
          user,
          token,
          memberRole: findUserTenant
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error del servidor: ${JSON.stringify(error)}`);
    }
  }



  // async updatePassword(body: updateMemberDto, userId: string, tenantId: string): Promise<ApiResponse<any>> {
  //   try {
  //     const saltOrRounds = 10;

  //     // Buscar la membresía del usuario en el tenant
  //     const userTenant = await this.memberTenantRepository.findOne({
  //       where: {
  //         user: { id: userId },
  //         tenant: { id: tenantId }
  //       }
  //     });

  //     if (!userTenant) {
  //       throw new NotFoundException("El usuario no pertenece al área de trabajo especificada");
  //     }

  //     // Validar la contraseña actual
  //     const passwordValid = await bcrypt.compare(body.password, userTenant.passwordTenant);
  //     if (!passwordValid) {
  //       throw new UnauthorizedException("La contraseña actual no es correcta, intente de nuevo");
  //     }

  //     // Actualizar la contraseña
  //     userTenant.passwordTenant = await bcrypt.hash(body.password_update, saltOrRounds);
  //     const updatedMember = await this.memberTenantRepository.save(userTenant);

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: "Contraseña actualizada exitosamente",
  //       data: {
  //         id: updatedMember.id,
  //         updated_at: updatedMember.updated_at
  //       }
  //     };
  //   } catch (err) {
  //     if (err instanceof NotFoundException || err instanceof UnauthorizedException) {
  //       throw err;
  //     }
  //     throw new InternalServerErrorException(`Error del servidor: ${JSON.stringify(err)}`);
  //   }
  // }


  // /**
  //  * Método para cambiar de tenant sin requerimiento de password
  //  */
  // async switchTenant(userId: string, tenantId: string): Promise<ApiResponse<any>> {
  //   try {
  //     // Verificar que el usuario existe y pertenece al tenant
  //     const memberTenant = await this.memberTenantRepository.findOne({
  //       where: {
  //         user: { id: userId },
  //         tenant: { id: tenantId }
  //       },
  //       relations: [
  //         'user',
  //         'tenant',
  //         'role',
  //         'role.permissions',
  //         'role.permissions.permission'
  //       ]
  //     });

  //     if (!memberTenant) {
  //       throw new UnauthorizedException("No tienes acceso a esta área de trabajo");
  //     }

  //     // Crear payload del token para el nuevo tenant
  //     const payload: PayloadTokenTenant = {
  //       userId,
  //       tenantId,
  //       role: memberTenant.role?.name
  //     };

  //     // Generar nuevo token
  //     const token = this.signJWT({
  //       expires: 10 * 24 * 60 * 60,
  //       payload,
  //     });

  //     // Preparar datos para la respuesta
  //     const permissions = memberTenant.role?.permissions?.map(p => ({
  //       id: p.permission.id,
  //       description: p.permission.description,
  //       module: p.permission.groupName
  //     })) || [];

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: "Cambio de área de trabajo exitoso",
  //       data: {
  //         user: {
  //           id: memberTenant.user.id,
  //           email: memberTenant.user.email,
  //           fullname: memberTenant.user.fullname
  //         },
  //         tenant: {
  //           id: memberTenant.tenant.id,
  //           name: memberTenant.tenant.name
  //         },
  //         role: {
  //           id: memberTenant.role?.id,
  //           name: memberTenant.role?.name,
  //           permissions
  //         },
  //         token
  //       }
  //     };
  //   } catch (error) {
  //     if (error instanceof UnauthorizedException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException(`Error del servidor: ${JSON.stringify(error)}`);
  //   }
  // }


  //? PRIVATE METHODS
  private getToken(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload);
    return token;
  }
}