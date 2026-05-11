import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { EleccionesService } from 'src/elecciones/services/elecciones.service';
import { EstudiantesService } from 'src/estudiantes/estudiantes.service';

/**
 * Guard que rinde la logica de control de acceso por tiempo y alfabético (HU-004).
 */
@Injectable()
export class ElectionGuard implements CanActivate {
  constructor(
    private readonly eleccionesService: EleccionesService,
    private readonly estudiantesService: EstudiantesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Aplicamos restricción en login de estudiantes
    if (req.path.includes('/auth/login') && !req.path.includes('login-admin')) {
      const registro = req.body?.registro;
      if (!registro) {
        return true; // Dejamos que el pipe de validación (DTO) o Auth fallen
      }

      const estudiante = await this.estudiantesService.buscarEstudiantePorRegistro(registro);
      if (!estudiante) {
        return true; // Dejamos que el servicio de login retorne credenciales inválidas para no fugar información
      }

      const eleccionActiva = await this.eleccionesService.obtenerEleccionActivaDelDia();
      if (!eleccionActiva) {
        throw new ForbiddenException({
          status: 'NOT_STARTED',
          message: 'No hay ninguna elección activa programada para hoy.',
        });
      }

      await this.eleccionesService.validarAccesoVotante(estudiante.apellidos, eleccionActiva.id);
    }

    return true;
  }
}
