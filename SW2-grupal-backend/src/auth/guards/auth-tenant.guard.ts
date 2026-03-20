import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TenantService } from 'src/user/services/tenant.service';
import { useTokenTenant } from 'src/utils/tenant.token';

@Injectable()
export class AuthTenantGuard implements CanActivate {
    constructor(
        private readonly tenantService: TenantService
    ) { }

    async canActivate(
        context: ExecutionContext,
    ) {
        const req = context.switchToHttp().getRequest<Request>();
        const token = req.headers["tenant-token"]
        if (!token || Array.isArray(token))
            throw new UnauthorizedException("Token tenant not found");

        const manageToken = useTokenTenant(token);
        if (typeof manageToken === "string")
            throw new UnauthorizedException(manageToken);

        if (manageToken.isExpired)
            throw new UnauthorizedException('Token expired');

        const findMemberTenant = await this.tenantService.getMemberTenantById(manageToken.memberTenantId);

        if (!findMemberTenant) {
            throw new UnauthorizedException('Miembro de tenant no encontrado o inactivo');
        }

        req.memberTenantId = findMemberTenant.id;
        req.nameTenant = findMemberTenant.tenant.name;
        return true;
    }
}