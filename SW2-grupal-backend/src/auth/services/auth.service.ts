import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse } from 'src/common/interfaces/response.interface';
import { UserService } from 'src/estudiantes/usuarios/services/user.service';
import { LoginDTO } from 'src/auth/dto/login.dto';
import { AuthResponse, PayloadToken } from 'src/auth/interfaces/auth.interface';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { compare } from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,

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

  //? PRIVATE METHODS
  private getToken(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
