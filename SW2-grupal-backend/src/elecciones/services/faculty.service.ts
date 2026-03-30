import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faculty } from '../entities/faculty.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { handleError } from 'src/common/helpers/function-helper';
import { Event } from 'src/elecciones/entities/event.entity';
import { CreateFacultyDto } from '../dto/faculty/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/faculty/update-faculty.dto';

@Injectable()
export class FacultyService {
    constructor(
        @InjectRepository(Faculty)
        private readonly facultyRepository: Repository<Faculty>,
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>
    ) { }

    async findAll(userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Faculty[]>> {
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

            // Construir la consulta
            const queryBuilder = this.facultyRepository.createQueryBuilder('faculty')
                .where('faculty.is_active = :isActive', { isActive: true });

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

    async findOne(id: string, userId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Buscar la facultad
            const faculty = await this.facultyRepository.findOne({
                where: {
                    id
                },
                relations: ['event']
            });

            if (!faculty) {
                throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
            }

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

    async create(createFacultyDto: CreateFacultyDto, userId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Crear la nueva facultad
            const newFaculty = this.facultyRepository.create({
                ...createFacultyDto,
                created_at: new Date(),
                updated_at: new Date()
            });

            const savedFaculty = await this.facultyRepository.save(newFaculty);

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

    async patch(id: string, updateFacultyDto: UpdateFacultyDto, userId: string): Promise<ApiResponse<Faculty>> {
        try {
            // Buscar la facultad a actualizar
            const currentFaculty = await this.facultyRepository.findOne({
                where: {
                    id
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
                relations: ['event']
            });

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

    async remove(id: string, userId: string): Promise<ApiResponse<null>> {
        try {
            // Buscar la facultad a desactivar
            const faculty = await this.facultyRepository.findOne({
                where: {
                    id
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

    async getFacultyStatistics(userId: string): Promise<ApiResponse<any>> {
        try {
            // Contar facultades activas
            const totalFaculties = await this.facultyRepository.count({
                where: {
                    is_active: true
                }
            });

            // Contar facultades inactivas
            const inactiveFaculties = await this.facultyRepository.count({
                where: {
                    is_active: false
                }
            });

            // Obtener facultades con más eventos
            const facultiesWithEvents = await this.facultyRepository.createQueryBuilder('faculty')
                .leftJoin('faculty.event', 'event')
                .addSelect('COUNT(event.id)', 'eventCount')
                .where('faculty.is_active = :isActive', { isActive: true })
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

            return createApiResponse(HttpStatus.OK, statistics, 'Estadísticas de facultades obtenidas correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'FacultyService.getFacultyStatistics',
                action: 'query',
                entityName: 'Faculty',
                additionalInfo: {
                    message: 'Error al obtener estadísticas de facultades',
                }
            });
        }
    }
}
