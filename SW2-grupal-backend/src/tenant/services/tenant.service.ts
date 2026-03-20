import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberTenant } from '../entities/member-tenant.entity'; // Asegúrate de ajustar la ruta según tu estructura

@Injectable()
export class TenantService {
    constructor(
        @InjectRepository(MemberTenant)
        private readonly memberTenantRepository: Repository<MemberTenant>
    ) { }

    /**
     * Verifica si un usuario es miembro de un tenant específico
     * @param userId ID del usuario
     * @param tenantId ID del tenant
     * @returns true si el usuario es miembro del tenant, false en caso contrario
     */
    async isUserMemberOfTenant(userId: string, tenantId: string): Promise<boolean> {
        try {
            const memberTenant = await this.memberTenantRepository.findOne({
                where: {
                    user: { id: userId },
                    tenant: { id: tenantId },
                }
            });

            return !!memberTenant; // Retorna true si se encontró un registro, false si no
        } catch (error) {
            console.error(`Error al verificar membresía del usuario ${userId} en tenant ${tenantId}:`, error.message);
            return false; // En caso de error, devolver false por seguridad
        }
    }
}