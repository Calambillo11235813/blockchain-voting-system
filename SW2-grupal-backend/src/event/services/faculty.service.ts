import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faculty } from '../entities/faculty.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { AuditService } from 'src/audit/services/audit.service';
import { ActionType } from 'src/audit/entities/audit.entity';
import { handleError } from 'src/common/helpers/function-helper';
import { MemberTenantService } from 'src/tenant/services/member-tenant.service';
import { Event } from 'src/event/entities/event.entity';
import { CreateFacultyDto } from '../dto/faculty/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/faculty/update-faculty.dto';

@Injectable()
export class FacultyService {
    constructor(
        @InjectRepository(Faculty)
        private readonly facultyRepository: Repository<Faculty>,
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
        private readonly memberTenantService: MemberTenantService,
        private readonly auditService: AuditService,
    ) { }

    async findAll(userId: string, memberTenantId: string, paginationDto: PaginationDto): Promise<ApiResponse<Faculty[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                search = '',
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const skip = page ? (page - 1) * limit : offset;

            // Construir la consulta
            const queryBuilder = this.facultyRepository.createQueryBuilder('faculty')
                .leftJoinAndSelect('faculty.tenant', 'tenant')
                .where('faculty.tenantId = :tenantId', { tenantId: existMembertenant.data.tenantId });

            // Aplicar filtros de búsqueda si se proporcionan
            if (search) {
                queryBuilder.andWhere(
                    '(faculty.name ILIKE :search OR faculty.location ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Aplicar ordenamiento y paginación
            queryBuilder
                .orderBy(`faculty.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [faculties, total] = await queryBuilder.getManyAndCount();

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Faculty',
                null,
                userId,
                existMembertenant.data.tenantId,
                null,
                null
            );

            return createApiResponse(
                HttpStatus.OK,
                faculties,
                'Facultades obtenidas correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.findAll',
                action: 'query',
                entityName: 'Faculty',
                additionalInfo: {
                    message: 'Error al obtener facultades',
                },
            });
        }
    }

    async findOne(id: string, userId: string, memberTenantId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Buscar la facultad
            const faculty = await this.facultyRepository.findOne({
                where: {
                    id,
                    tenantId
                },
                relations: ['tenant']
            });

            if (!faculty) {
                throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
            }

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Faculty',
                id,
                userId,
                tenantId,
                null,
                null
            );

            return createApiResponse(HttpStatus.OK, faculty, 'Facultad obtenida correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.findOne',
                action: 'query',
                entityName: 'Faculty',
                entityId: id,
                additionalInfo: {
                    message: 'Error al obtener facultad',
                },
            });
        }
    }

    async create(createFacultyDto: CreateFacultyDto, userId: string, memberTenantId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Crear la nueva facultad
            const newFaculty = this.facultyRepository.create({
                ...createFacultyDto,
                tenantId,
                created_at: new Date(),
                updated_at: new Date()
            });

            const savedFaculty = await this.facultyRepository.save(newFaculty);

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.CREATE,
                'Faculty',
                savedFaculty.id,
                userId,
                tenantId,
                null,
                savedFaculty
            );

            return createApiResponse(HttpStatus.CREATED, savedFaculty, 'Facultad creada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.create',
                action: 'create',
                entityName: 'Faculty',
                additionalInfo: {
                    dto: createFacultyDto,
                    message: 'Error al crear facultad',
                }
            });
        }
    }

    async patch(id: string, updateFacultyDto: UpdateFacultyDto, userId: string, memberTenantId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Buscar la facultad a actualizar
            const currentFaculty = await this.facultyRepository.findOne({
                where: {
                    id,
                    tenantId
                }
            });

            if (!currentFaculty) {
                throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
            }

            // Guardar valores anteriores para auditoría
            const oldValues = { ...currentFaculty };

            // Precargar la entidad con los valores actualizados
            const faculty = await this.facultyRepository.preload({
                id,
                tenantId,
                ...updateFacultyDto,
                updated_at: new Date()
            });

            if (!faculty) {
                throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
            }

            // Guardar la facultad actualizada
            await this.facultyRepository.save(faculty);

            // Obtener la facultad actualizada con todas sus relaciones si es necesario
            const updatedFaculty = await this.facultyRepository.findOne({
                where: { id },
                relations: ['events'] // Añade aquí las relaciones que necesites
            });

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Faculty',
                id,
                userId,
                tenantId,
                oldValues,
                updatedFaculty
            );

            return createApiResponse(HttpStatus.OK, updatedFaculty, 'Facultad actualizada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.patch',
                action: 'update',
                entityName: 'Faculty',
                entityId: id,
                additionalInfo: {
                    dto: updateFacultyDto,
                    message: 'Error al actualizar facultad',
                }
            });
        }
    }

    async remove(id: string, userId: string, memberTenantId: string): Promise<ApiResponse<null>> {
        try {
            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Buscar la facultad a desactivar
            const faculty = await this.facultyRepository.findOne({
                where: {
                    id,
                    tenantId
                }
            });

            if (!faculty) {
                throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
            }

            // Comprobar si hay eventos activos asociados a esta facultad
            const activeEvents = await this.eventRepository.count({
                where: {
                    faculty: { id },
                    is_active: true
                }
            });

            if (activeEvents > 0) {
                // En lugar de impedir la eliminación, solo establecemos is_active en false (soft delete)
                const oldValues = { ...faculty };

                await this.facultyRepository.update(id, {
                    is_active: false,
                    updated_at: new Date()
                });

                // Registrar la acción en el log de auditoría
                await this.auditService.logAction(
                    ActionType.UPDATE,
                    'Faculty',
                    id,
                    userId,
                    tenantId,
                    oldValues,
                    { ...faculty, state: false }
                );

                return createApiResponse(
                    HttpStatus.OK,
                    null,
                    'Facultad desactivada correctamente. Nota: Existen eventos activos asociados a esta facultad.'
                );
            }

            // Si no hay eventos activos, guardamos valores antiguos para auditoría
            const oldValues = { ...faculty };

            // Desactivamos la facultad
            await this.facultyRepository.update(id, {
                is_active: false,
                updated_at: new Date()
            });

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.DELETE,
                'Faculty',
                id,
                userId,
                tenantId,
                oldValues,
                { state: false }
            );

            return createApiResponse(HttpStatus.OK, null, 'Facultad desactivada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.remove',
                action: 'soft-delete',
                entityName: 'Faculty',
                entityId: id,
                additionalInfo: {
                    message: 'Error al desactivar facultad',
                }
            });
        }
    }

    async getFacultyStatistics(userId: string, memberTenantId: string): Promise<ApiResponse<any>> {
        try {
            // Verificar que el memberTenant existe
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Contar facultades activas
            const totalFaculties = await this.facultyRepository.count({
                where: {
                    tenantId,
                    is_active: true
                }
            });

            // Contar facultades inactivas
            const inactiveFaculties = await this.facultyRepository.count({
                where: {
                    tenantId,
                    is_active: false
                }
            });

            // Obtener facultades con más eventos
            const facultiesWithEvents = await this.facultyRepository.createQueryBuilder('faculty')
                .leftJoin('faculty.events', 'event')
                .addSelect('COUNT(event.id)', 'eventCount')
                .where('faculty.tenantId = :tenantId', { tenantId })
                .andWhere('faculty.state = :state', { state: true })
                .groupBy('faculty.id')
                .orderBy('eventCount', 'DESC')
                .limit(5)
                .getRawMany();

            const statistics = {
                totalFaculties,
                inactiveFaculties,
                activeFaculties: totalFaculties - inactiveFaculties,
                facultiesWithMostEvents: facultiesWithEvents
            };

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Faculty',
                null,
                userId,
                tenantId,
                null,
                { action: 'statistics' }
            );

            return createApiResponse(HttpStatus.OK, statistics, 'Estadísticas de facultades obtenidas correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.getFacultyStatistics',
                action: 'query',
                entityName: 'Faculty',
                additionalInfo: {
                    memberTenantId,
                    message: 'Error al obtener estadísticas de facultades',
                }
            });
        }
    }
}