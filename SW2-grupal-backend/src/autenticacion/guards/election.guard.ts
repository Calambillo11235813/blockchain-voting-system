import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { EleccionesLegacyService } from 'src/elecciones/services/elecciones.service';
import { ElectoresService } from 'src/electores/electores.service';

/**
 * Guard que rinde la logica de control de acceso por tiempo y alfabético (HU-004).
 */
@Injectable()
export class ElectionGuard implements CanActivate {
  constructor(
    private readonly eleccionesService: EleccionesLegacyService,
    private readonly electoresService: ElectoresService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Aplicamos restricción en login de electores
    if (req.path.includes('/auth/login') && !req.path.includes('login-admin')) {
      const registro = req.body?.registro;
      if (!registro) {
        return true; // Dejamos que el pipe de validación (DTO) o Auth fallen
      }

      const elector = await this.electoresService.buscarPorRegistro(registro);
      if (!elector) {
        return true; // Dejamos que el servicio de login retorne credenciales inválidas para no fugar información
      }

      const eleccionActiva = await this.eleccionesService.obtenerEleccionActivaDelDia();
      if (!eleccionActiva) {
        throw new ForbiddenException({
          status: 'NOT_STARTED',
          message: 'No hay ninguna elección activa programada para hoy.',
        });
      }

      await this.eleccionesService.validarAccesoVotante(elector.apellido, eleccionActiva.id);
    }

    return true;
  }
}
