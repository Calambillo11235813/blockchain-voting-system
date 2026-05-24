import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse } from 'src/compartido/respuesta';
import { LoginDTO } from 'src/autenticacion/dto/login.dto';
import { AuthResponse } from 'src/autenticacion/interfaces/auth.interface';
import { JwtPayload } from 'src/autenticacion/interfaces/jwt-payload.interface';
import { LoginAdminDto } from 'src/autenticacion/dto/login-admin.dto';
import { AdminsService } from 'src/administradores/admins.service';
import { EleccionesLegacyService } from 'src/elecciones/services/elecciones.service';
import { ElectoresService } from 'src/electores/electores.service';
import { PadronService } from 'src/elecciones/services/padron.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly electoresService: ElectoresService,
    private readonly padronService: PadronService,
    private readonly adminsService: AdminsService,
    private readonly eleccionesService: EleccionesLegacyService,
    private readonly jwtService: JwtService,
  ) { }


  /**
   * Inicia sesión de un elector (Estudiante o Docente) (RF2).
   * @param registro Número de registro universitario.
   * @param passwordInstitucional Contraseña simulada (iniciales de apellidos + CI).
   * @param eleccionId UUID de la elección en la que desea participar.
   * @returns Token JWT de sesión y datos del elector.
   * @throws UnauthorizedException si las credenciales no son válidas.
   */
  async loginElector(registro: string, passwordInstitucional: string, eleccionId?: string): Promise<{ token: string; elector: any }> {
    try {
      // Paso A (Identidad Global): Validar que la identidad existe en el catálogo maestro.
      const elector = await this.electoresService.buscarPorRegistro(registro);

      // Paso B (Credenciales UAGRM): Simular validación contra el protocolo de la universidad.
      const expectedPassword = this.calcularPasswordEsperado(elector.apellido, elector.ci);
      if (String(passwordInstitucional || '').trim() !== expectedPassword) {
        throw new UnauthorizedException('Credenciales institucionales inválidas');
      }

      // Paso C (Validación en Whitelist): Garantizar que el elector está habilitado para el comicio.
      // Si el frontend no mandó la elección, inferimos la elección activa del día
      let targetEleccionId = eleccionId;
      if (!targetEleccionId) {
        const eleccionActiva = await this.eleccionesService.obtenerEleccionActivaDelDia();
        if (!eleccionActiva) {
          throw new ForbiddenException('No hay ninguna elección activa programada para hoy.');
        }
        targetEleccionId = eleccionActiva.id;
      }

      await this.padronService.validarAccesoVotante(registro, targetEleccionId);

      // Paso D (Sesión/JWT): Generar token con payload de sesión
      const payload: JwtPayload = {
        sub: elector.id,
        registro: elector.registro,
        role: elector.estamento,
      };

      const token = this.getToken(payload);

      return {
        token,
        elector,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      // Considerar errores lanzados por PadronService como NotFoundException
      if (error.status === HttpStatus.NOT_FOUND) {
        throw new UnauthorizedException('Identidad no encontrada o no habilitada en el padrón');
      }
      throw new InternalServerErrorException(`Error del servidor: ${error.message || JSON.stringify(error)}`);
    }
  }

  /**
   * Inicia sesión de administrador (Corte Electoral).
   * @param loginAdminDto Datos de inicio de sesión.
  * @returns Token JWT con rol del administrador.
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
        role: administrador.rol,
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
