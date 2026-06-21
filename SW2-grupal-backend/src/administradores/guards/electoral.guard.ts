import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Administrador, RolAdministrador } from '../entities/administrador.entity';

@Injectable()
export class ElectoralGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as Administrador;

    if (!user || user.rol !== RolAdministrador.ELECTORAL) {
      throw new ForbiddenException('Acceso restringido: requiere rol de ELECTORAL.');
    }

    return true;
  }
}
