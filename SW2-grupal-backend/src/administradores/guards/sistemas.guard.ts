import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Administrador, RolAdministrador } from '../entities/administrador.entity';

@Injectable()
export class SistemasGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as Administrador;

    if (!user || user.rol !== RolAdministrador.SISTEMAS) {
      throw new ForbiddenException('Acceso restringido: requiere rol de SISTEMAS.');
    }

    return true;
  }
}
