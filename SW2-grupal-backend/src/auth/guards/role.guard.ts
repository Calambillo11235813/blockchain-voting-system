import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { User } from 'src/auth/entities/user.entity';
import { Permission } from '../entities/permission.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
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

        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role', 'role.permissions']
        });

        if (!user || !user.role) {
            throw new UnauthorizedException("El usuario no tiene un rol asignado");
        }

        const requiredPermissions = await this.permissionRepository.find({
            where: permissions.map(desc => ({ description: desc }))
        });

        if (requiredPermissions.length !== permissions.length) {
            throw new NotFoundException("No existen todos los permisos requeridos");
        }

        const hasAllPermissions = requiredPermissions.every(reqPerm =>
            user.role.permissions.some(rolePerm =>
                rolePerm.id === reqPerm.id || rolePerm.description === reqPerm.description
            )
        );

        if (hasAllPermissions) {
            return true;
        }

        throw new UnauthorizedException("El rol no tiene los permisos necesarios");
    }
}