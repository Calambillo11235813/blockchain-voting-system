import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { Repository } from 'typeorm';
import { IOptionMemberTenant } from '../interface/option-tenant.interface';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadMemberTenant } from '../interface/jwt-payload-member-tenant.interface';
import { ApiResponse } from 'src/common/interfaces/response.interface';
import { ListTenant } from '../interface/tenant.interface';
import { handleError } from 'src/common/helpers/function-helper';

@Injectable()
export class TenantService {
    constructor(
        @InjectRepository(MemberTenant)
        private readonly memberTenantRepository: Repository<MemberTenant>,
        private readonly jwtService: JwtService
    ) { }

    async getAllTenants({
        skip,
        take,
        where,
        select,
        order,
        includeTokens = true,
        userId
    }: IOptionMemberTenant): Promise<ApiResponse<ListTenant>> {
        try {
            // Crear query builder para consultas complejas
            const query = this.memberTenantRepository.createQueryBuilder('memberTenant');

            // Incluir relaciones si se van a generar tokens
            if (includeTokens) {
                query.leftJoinAndSelect('memberTenant.tenant', 'tenant')
                    .leftJoinAndSelect('memberTenant.role', 'role');
            }

            // Filtrar por usuario si se proporciona userId
            if (userId) {
                query.leftJoinAndSelect('memberTenant.user', 'user')
                    .andWhere('user.id = :userId', { userId });
            }

            // Aplicar condiciones where si existen
            if (where) {
                Object.entries(where).forEach(([key, value]) => {
                    query.andWhere(`memberTenant.${key} = :${key}`, { [key]: value });
                });
            }

            // Aplicar paginación
            if (skip) query.skip(skip);
            if (take) query.take(take);

            // Aplicar orden
            if (order) {
                Object.entries(order).forEach(([key, value]) => {
                    query.orderBy(`memberTenant.${key}`, value.toString().toUpperCase() as 'ASC' | 'DESC');
                });
            }

            // Aplicar selección de campos
            // if (select && !includeTokens) {
            if (select) {
                const selections = Object.entries(select)
                    .filter(([, value]) => value === true)
                    .map(([key]) => `memberTenant.${key}`);

                if (selections.length > 0) {
                    query.select(selections);
                }
            }

            // Ejecutar la consulta
            const allMembers = await query.getMany();

            // // Si no se requieren tokens, devolver tal cual
            // if (!includeTokens) {
            //     return allMembers;
            // }

            // Generar tokens para cada miembro
            const tenantsWithTokens = allMembers.map(memberTenant => {

                const payload: JwtPayloadMemberTenant = {
                    memberTenantId: memberTenant.id,
                    nameTenant: memberTenant.tenant.name,
                };

                const token = this.getToken(payload);

                return {
                    memberTenantId: memberTenant.id,
                    tenantId: memberTenant.tenant.id,
                    tenantName: memberTenant.tenant.name,
                    displayName: memberTenant.tenant.display_name,
                    role: memberTenant.role,
                    token
                };
            });

            return {
                statusCode: HttpStatus.OK,
                message: 'Tenants obtenidos correctamente',
                data: {
                    total: tenantsWithTokens.length,
                    tenants: tenantsWithTokens,
                }
            };
        } catch (err) {
            throw handleError(err, {
                context: 'TenantService.getAllTenants',
                action: 'query',
                entityName: 'WebhookPayment',
                additionalInfo: {
                    message: "Error al procesar el webhook de pago",
                }
            });
        }
    }

    async countTenants({
        where,
    }: IOptionMemberTenant) {
        try {
            // Crear query builder para el conteo
            const queryBuilder = this.memberTenantRepository.createQueryBuilder('memberTenant');

            // Aplicar condiciones where si existen
            if (where) {
                Object.entries(where).forEach(([key, value]) => {
                    queryBuilder.andWhere(`memberTenant.${key} = :${key}`, { [key]: value });
                });
            }

            // Obtener el conteo
            const count = await queryBuilder.getCount();
            return count;
        } catch (err) {
            throw handleError(err, {
                context: 'TenantService.countTenants',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al contar los tenants",
                }
            });
        }
    }

    async getMemberTenantById(memberTenantId: string) {
        try {
            return await this.memberTenantRepository.findOne({
                where: { id: memberTenantId },
                relations: ['tenant', 'user', 'role']
            });
        } catch (err) {
            throw handleError(err, {
                context: 'TenantService.getMemberTenantById',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al obtener el tenant por ID",
                }
            });
        }
    }

    //? PRIVATE METHODS
    private getToken(payload: JwtPayloadMemberTenant): string {
        const token = this.jwtService.sign(payload);
        return token;
    }
}