import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,

        @InjectRepository(MemberTenant)
        private readonly memberTenantRepository: Repository<MemberTenant>,

        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,

        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const permissions = this.reflector.get<string[]>('permissions', context.getHandler());
        if (!permissions) {
            return true;
        }

        const req = context.switchToHttp().getRequest<Request>();
        const userId = req.userId;
        const tenantId = req.tenantId;

        const memberTenant = await this.memberTenantRepository.findOne({
            where: {
                tenant: { id: tenantId },
                user: { id: userId }
            },
            relations: ['role', 'user']
        });

        if (!memberTenant) {
            throw new UnauthorizedException("El usuario debe pertenecer a un área de trabajo");
        }

        const requiredPermissions = await this.permissionRepository.find({
            where: permissions.map(desc => ({ description: desc }))
        });

        if (requiredPermissions.length !== permissions.length) {
            throw new NotFoundException("No existen todos los permisos requeridos");
        }

        const roleWithPermissions = await this.roleRepository.findOne({
            where: { id: memberTenant.role.id },
            relations: ['permissions']
        });

        if (!roleWithPermissions) {
            throw new NotFoundException("No se encontró el rol del usuario");
        }

        const hasAllPermissions = requiredPermissions.every(reqPerm =>
            roleWithPermissions.permissions.some(rolePerm =>
                rolePerm.id === reqPerm.id || rolePerm.description === reqPerm.description
            )
        );

        if (hasAllPermissions) {
            return true;
        }

        throw new UnauthorizedException("El rol no tiene los permisos necesarios");
    }
}