import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        // Role/Permission entities removed — bypass permission checks.
        return true;
    }
}