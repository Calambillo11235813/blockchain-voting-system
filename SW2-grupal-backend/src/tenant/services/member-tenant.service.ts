import { Injectable, NotFoundException, ConflictException, ForbiddenException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberTenant } from '../entities/member-tenant.entity';
import { User } from 'src/auth/entities/user.entity';
import { Role } from 'src/auth/entities/role.entity';
import { Tenant } from '../entities/tenant.entity';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { handleError } from 'src/common/helpers/function-helper';
import { AuditService } from 'src/audit/services/audit.service';
import { ActionType } from 'src/audit/entities/audit.entity';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateMemberTenantDto } from '../dto/member-tenant/create-member-tenant.dto';
import { UpdateMemberTenantDto } from '../dto/member-tenant/update-member-tenant.dto';

@Injectable()
export class MemberTenantService {
    constructor(
        @InjectRepository(MemberTenant)
        private readonly memberTenantRepository: Repository<MemberTenant>,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        private readonly auditService: AuditService,
    ) { }

    async create(createMemberTenantDto: CreateMemberTenantDto, currentUserId: string): Promise<ApiResponse<Omit<MemberTenant, 'password_tenant'>>> {
        try {
            const { userId, tenantId, roleId, password_tenant } = createMemberTenantDto;

            const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
            if (!tenant) {
                throw new NotFoundException(`Tenant con ID ${tenantId} no encontrado`);
            }

            const user = await this.userRepository.findOneBy({ id: userId });
            if (!user) {
                throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
            }

            const role = await this.roleRepository.findOneBy({ id: roleId });
            if (!role) {
                throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
            }

            const existingMembership = await this.memberTenantRepository.findOne({
                where: {
                    tenantId,
                    user: { id: userId }
                }
            });

            if (existingMembership) {
                throw new ConflictException(`El usuario ya es miembro de este tenant`);
            }

            let hashedPassword = null;
            if (password_tenant) {
                hashedPassword = await bcrypt.hash(password_tenant, 10);
            }

            const newMemberTenant = this.memberTenantRepository.create({
                tenant: { id: tenantId },
                user: { id: userId },
                role: { id: roleId },
                password_tenant: hashedPassword,
                // Uncomment the following lines only if these properties exist in your MemberTenant entity
                // tenant_address,
                // event_address
            });

            const savedMemberTenant = await this.memberTenantRepository.save(newMemberTenant);

            await this.auditService.logAction(
                ActionType.CREATE,
                'MemberTenant',
                savedMemberTenant.id,
                currentUserId,
                tenantId,
                null,
                { ...savedMemberTenant, password_tenant: password_tenant ? '[REDACTED]' : null }
            );

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_tenant: _, ...result } = savedMemberTenant;

            return createApiResponse(HttpStatus.CREATED, result, 'Miembro añadido al tenant exitosamente');
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.create',
                action: 'create',
                entityName: 'MemberTenant',
                additionalInfo: {
                    createMemberTenantDto,
                    message: "Error al crear el miembro del tenant"
                }
            });
        }
    }

    async findAll(tenantId: string, paginationDto: PaginationDto, currentUserId: string): Promise<ApiResponse<Omit<MemberTenant, 'password_tenant'>[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                search = '',
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            const skip = page ? (page - 1) * limit : offset;

            const queryBuilder = this.memberTenantRepository.createQueryBuilder('memberTenant')
                .leftJoinAndSelect('memberTenant.user', 'user')
                .leftJoinAndSelect('memberTenant.role', 'role')
                .leftJoinAndSelect('memberTenant.tenant', 'tenant')
                .where('memberTenant.tenantId = :tenantId', { tenantId });

            if (search) {
                queryBuilder.andWhere(
                    '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search OR role.name ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            queryBuilder
                .orderBy(`memberTenant.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [members, total] = await queryBuilder.getManyAndCount();

            const sanitizedMembers = members.map(member => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password_tenant: _, ...sanitizedMember } = member;
                return sanitizedMember;
            });

            await this.auditService.logAction(
                ActionType.VIEW,
                'MemberTenant',
                null,
                currentUserId,
                tenantId,
                null,
                { action: 'list' }
            );

            return createApiResponse(
                HttpStatus.OK,
                sanitizedMembers,
                'Miembros del tenant obtenidos correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.findAll',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al obtener los miembros del tenant"
                }
            });
        }
    }

    async findOne(id: string, currentUserId: string): Promise<ApiResponse<Omit<MemberTenant, 'password_tenant'>>> {
        try {
            const member = await this.memberTenantRepository.findOne({
                where: { id },
                relations: ['user', 'role', 'tenant']
            });

            if (!member) {
                throw new NotFoundException(`Miembro con ID ${id} no encontrado`);
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_tenant: _, ...result } = member;

            await this.auditService.logAction(
                ActionType.VIEW,
                'MemberTenant',
                id,
                currentUserId,
                member.tenantId,
                null,
                null
            );

            return createApiResponse(200, result, 'Miembro del tenant obtenido correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.findOne',
                action: 'query',
                entityName: 'MemberTenant',
                entityId: id,
                additionalInfo: {
                    message: "Error al obtener el miembro del tenant"
                }
            });
        }
    }

    async update(id: string, updateMemberTenantDto: UpdateMemberTenantDto, currentUserId: string): Promise<ApiResponse<Omit<MemberTenant, 'password_tenant'>>> {
        try {
            const member = await this.memberTenantRepository.findOne({
                where: { id },
                relations: ['user', 'role', 'tenant']
            });

            if (!member) {
                throw new NotFoundException(`Miembro con ID ${id} no encontrado`);
            }

            const tenantId = member.tenantId;

            const updateData: Partial<MemberTenant> = {};

            if (updateMemberTenantDto.roleId) {
                const role = await this.roleRepository.findOneBy({ id: updateMemberTenantDto.roleId });
                if (!role) {
                    throw new NotFoundException(`Rol con ID ${updateMemberTenantDto.roleId} no encontrado`);
                }
                updateData.role = role;
            }

            if (updateMemberTenantDto.password_tenant) {
                updateData.password_tenant = await bcrypt.hash(updateMemberTenantDto.password_tenant, 10);
            }

            // if (updateMemberTenantDto.tenant_address !== undefined) {
            //     updateData.tenant_address = updateMemberTenantDto.tenant_address;
            // }

            // if (updateMemberTenantDto.event_address !== undefined) {
            //     updateData.event_address = updateMemberTenantDto.event_address;
            // }

            // Guardar estado anterior para auditoría
            const oldValues = { ...member, password_tenant: member.password_tenant ? '[REDACTED]' : null };

            // Actualizar el miembro
            await this.memberTenantRepository.update(id, updateData);

            // Obtener el miembro actualizado
            const updatedMember = await this.memberTenantRepository.findOne({
                where: { id },
                relations: ['user', 'role', 'tenant']
            });

            // Registrar acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'MemberTenant',
                id,
                currentUserId,
                tenantId,
                oldValues,
                { ...updatedMember, password_tenant: updatedMember.password_tenant ? '[REDACTED]' : null }
            );

            // Eliminar datos sensibles
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_tenant: _, ...result } = updatedMember;

            return createApiResponse(HttpStatus.OK, result, 'Miembro del tenant actualizado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.update',
                action: 'update',
                entityName: 'MemberTenant',
                entityId: id,
                additionalInfo: {
                    updateMemberTenantDto,
                    message: "Error al actualizar el miembro del tenant"
                }
            });
        }
    }

    async remove(id: string, currentUserId: string): Promise<ApiResponse<null>> {
        try {
            // Verificar que el miembro existe
            const member = await this.memberTenantRepository.findOne({
                where: { id },
                relations: ['user', 'tenant']
            });

            if (!member) {
                throw new NotFoundException(`Miembro con ID ${id} no encontrado`);
            }

            const tenantId = member.tenantId;

            // Evitar que se elimine a sí mismo
            if (member.user.id === currentUserId) {
                throw new ForbiddenException('No puedes eliminarte a ti mismo del tenant');
            }

            // Guardar estado anterior para auditoría
            const oldValues = { ...member, password_tenant: member.password_tenant ? '[REDACTED]' : null };

            // Eliminar el miembro
            await this.memberTenantRepository.remove(member);

            // Registrar acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.DELETE,
                'MemberTenant',
                id,
                currentUserId,
                tenantId,
                oldValues,
                null
            );

            return createApiResponse(204, null, 'Miembro eliminado del tenant correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.remove',
                action: 'delete',
                entityName: 'MemberTenant',
                entityId: id,
                additionalInfo: {
                    message: "Error al eliminar el miembro del tenant"
                }
            });
        }
    }

    /**
     * Encuentra un MemberTenant por userId y tenantId
     */
    async findByUserAndTenant(userId: string, tenantId: string): Promise<MemberTenant> {
        try {
            const member = await this.memberTenantRepository.findOne({
                where: {
                    user: { id: userId },
                    tenantId: tenantId
                },
                relations: ['user', 'role', 'tenant']
            });

            return member;
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.findByUserAndTenant',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al encontrar el miembro del tenant por usuario y tenant"
                }
            });
        }
    }

    /**
     * Verifica si un usuario tiene un rol específico en un tenant
     */
    async checkUserRole(userId: string, tenantId: string, roleIds: string[]): Promise<boolean> {
        try {
            const member = await this.memberTenantRepository.findOne({
                where: {
                    user: { id: userId },
                    tenantId: tenantId
                },
                relations: ['role']
            });

            if (!member) return false;
            return roleIds.includes(member.role.id);
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.checkUserRole',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al verificar el rol del usuario en el tenant"
                }
            });
        }
    }

    /**
     * Verifica si un usuario tiene acceso a un recurso específico en un tenant
     */
    async verifyResourceAccess(userId: string, tenantId: string, resourceId: string, resourceType: string): Promise<boolean> {
        try {
            // Primero verificamos si el usuario pertenece al tenant
            const member = await this.findByUserAndTenant(userId, tenantId);
            if (!member) return false;

            // Verificar si el recurso pertenece al tenant (dependerá del tipo de recurso)
            let resourceBelongsToTenant = false;

            switch (resourceType) {
                case 'Event':
                    // Verificar si el evento pertenece al tenant (consulta específica para eventos)
                    const event = await this.getMemberTenantEvent(tenantId, resourceId);
                    resourceBelongsToTenant = !!event;
                    break;
                // Agregar más casos según sea necesario
                default:
                    return false;
            }

            return resourceBelongsToTenant;
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.verifyResourceAccess',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al verificar el acceso al recurso del usuario en el tenant"
                }
            });
        }
    }

    /**
     * Obtiene un evento específico para verificar pertenencia al tenant
     * (Este método es un ejemplo y debería adaptarse según la estructura real de tu base de datos)
     */
    private async getMemberTenantEvent(tenantId: string, eventId: string): Promise<any> {
        // Esta consulta dependerá de cómo estén relacionados los eventos con los tenants
        const queryBuilder = this.memberTenantRepository.manager.createQueryBuilder()
            .select('event')
            .from('Event', 'event')
            .where('event.id = :eventId', { eventId })
            .andWhere('event.tenantId = :tenantId', { tenantId });

        return await queryBuilder.getOne();
    }


    async verifyTenantPassword(memberTenantId: string, password: string): Promise<boolean> {
        try {
            const member = await this.memberTenantRepository.findOneBy({ id: memberTenantId });

            if (!member || !member.password_tenant) {
                return false;
            }

            return bcrypt.compare(password, member.password_tenant);
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.verifyTenantPassword',
                action: 'verify',
                entityName: 'MemberTenant',
                entityId: memberTenantId,
                additionalInfo: {
                    message: "Error al verificar la contraseña del tenant"
                }
            });
        }
    }


    async getUserTenants(userId: string): Promise<ApiResponse<any[]>> {
        try {
            const members = await this.memberTenantRepository.find({
                where: {
                    user: { id: userId }
                },
                relations: ['tenant', 'role']
            });

            const userTenants = members.map(member => {

                return {
                    memberTenantId: member.id,
                    tenant: member.tenant,
                    role: member.role,
                    hasPassword: !!member.password_tenant
                };
            });

            return createApiResponse(200, userTenants, 'Tenants del usuario obtenidos correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'MemberTenantService.getUserTenants',
                action: 'query',
                entityName: 'MemberTenant',
                additionalInfo: {
                    message: "Error al obtener los tenants del usuario"
                }
            });
        }
    }


}