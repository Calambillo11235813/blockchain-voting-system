import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse } from 'src/compartido/respuesta';
import { LoginDTO } from 'src/auth/dto/login.dto';
import { AuthResponse } from 'src/auth/interfaces/auth.interface';
import { EstudiantesService } from 'src/estudiantes/estudiantes.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { LoginAdminDto } from 'src/auth/dto/login-admin.dto';
import { AdminsService } from 'src/admins/admins.service';
import { EleccionesService } from 'src/elecciones/services/elecciones.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly estudiantesService: EstudiantesService,
    private readonly adminsService: AdminsService,
    private readonly eleccionesService: EleccionesService,
    private readonly jwtService: JwtService,

  ) { }


  /**
   * Inicia sesión de estudiante (HU-002).
   * @param loginDTO Datos de inicio de sesión.
   * @returns Token JWT.
   * @throws UnauthorizedException si las credenciales no son válidas o el estudiante no está habilitado.
   */
  async loginEstudiante(loginDTO: LoginDTO): Promise<ApiResponse<AuthResponse>> {
    try {
      const { registro, password } = loginDTO;

      const estudiante = await this.estudiantesService.buscarEstudiantePorRegistro(registro);

      if (!estudiante || !estudiante.estaHabilitado) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const expectedPassword = this.calcularPasswordEsperado(estudiante.apellidos, estudiante.ci);

      if (String(password || '').trim() !== expectedPassword) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // NOTA: La validación de horario y restricción alfabética (HU-004) 
      // fue migrada al middleware ElectionGuard y a EleccionesService.validarAccesoVotante
      // para cumplir con las nuevas reglas. 

      const payload: JwtPayload = {
        sub: estudiante.id,
        registro: estudiante.registro,
        role: 'ESTUDIANTE',
      };

      const token = this.getToken(payload);

      return {
        statusCode: HttpStatus.OK,
        message: "Inicio de sesión exitoso",
        data: {
          token
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error del servidor: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Inicia sesión de administrador (Corte Electoral).
   * @param loginAdminDto Datos de inicio de sesión.
   * @returns Token JWT con rol ADMIN.
   * @throws UnauthorizedException si las credenciales no son válidas.
   */
  async loginAdministrador(loginAdminDto: LoginAdminDto): Promise<ApiResponse<AuthResponse>> {
    try {
      const { correo, password } = loginAdminDto;

      const administrador = await this.adminsService.buscarAdministradorPorCorreo(correo);

      if (!administrador) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const passwordOk = await bcrypt.compare(String(password || ''), administrador.password);

      if (!passwordOk) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const payload: JwtPayload = {
        sub: administrador.id,
        role: 'ADMIN',
        correo: administrador.correo,
      };

      const token = this.getToken(payload);

      return {
        statusCode: HttpStatus.OK,
        message: 'Inicio de sesión exitoso',
        data: {
          token,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
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

  private calcularPasswordEsperado(apellidos: string, ci: string): string {
    const initials = String(apellidos || '')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase();

    return `${initials}${String(ci || '').trim()}`;
  }

  private formatearHoraHHMM(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private mensajeNoEsSuTurno(horaInicio: string, horaFin: string): string {
    return (
      '¡Hola! 👋 Aún no es tu turno de votación.\n\n' +
      'Para asegurar que el sistema funcione de forma rápida y sin demoras para todos, hemos organizado el ingreso por orden alfabético. ' +
      `Según la inicial de tu apellido, tu horario asignado es de ${horaInicio} a ${horaFin}.\n\n` +
      '¡Te esperamos a esa hora para registrar tu voto de forma segura! 🗳️'
    );
  }
}
