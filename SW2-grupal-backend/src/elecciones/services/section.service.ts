import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from '../entities/section.entity';
import { Event } from '../entities/event.entity';
import { TicketService } from './ticket.service';
import { CreateSectionDto } from '../dto/section/create-section.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { handleError } from 'src/common/helpers/function-helper';
import { UpdateSectionDto } from '../dto/section/update-section.dto';
import { Ticket } from '../entities/ticket.entity';
import { UpdateTicketPriceDto } from '../dto/ticket/update-price-ticket.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class SectionService {
    constructor(
        @InjectRepository(Section)
        private sectionRepository: Repository<Section>,
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(Ticket)
        private ticketRepository: Repository<Ticket>,
        private ticketService: TicketService,
    ) { }

    /**
     * Crear una nueva sección
     */
    async create(createSectionDto: CreateSectionDto & { event?: Event }, userId: string): Promise<ApiResponse<Section>> {
        try {
            // Extraer eventId y otros campos
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { eventId, ...sectionDetails } = createSectionDto;

            // Usar el evento que viene del pipe o buscar por eventId
            let event = createSectionDto.event;
            if (!event && eventId) {
                event = await this.eventRepository.findOne({
                    where: {
                        id: eventId,
                        is_active: true
                    }
                });

                if (!event) {
                    throw new NotFoundException(`Evento con ID ${eventId} no encontrado`);
                }
            }

            if (!event) {
                throw new BadRequestException('Se requiere un evento válido para crear una sección');
            }

            // Validar capacidad y precio
            if (createSectionDto.capacity !== undefined && createSectionDto.capacity < 0) {
                throw new BadRequestException('La capacidad no puede ser negativa');
            }

            if (createSectionDto.price !== undefined && createSectionDto.price < 0) {
                throw new BadRequestException('El precio no puede ser negativo');
            }

            // Crear sección
            const section = this.sectionRepository.create({
                ...sectionDetails,
                event,
                is_active: true
            });

            await this.sectionRepository.save(section);

            // Recuperar la sección con relaciones
            const savedSection = await this.sectionRepository.findOne({
                where: { id: section.id },
                relations: ['event']
            });

            return createApiResponse(HttpStatus.CREATED, savedSection, 'Sección creada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.create',
                action: 'create',
                entityName: 'Section',
                additionalInfo: {
                    dto: { ...createSectionDto, event: undefined },
                    message: 'Error al crear sección'
                }
            });
        }
    }

    /**
     * Obtener todas las secciones con paginación
     */
    async findAll(userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Section[]>> {
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

            // Construir la consulta con QueryBuilder
            const queryBuilder = this.sectionRepository.createQueryBuilder('section')
                .leftJoinAndSelect('section.event', 'event')
                .where('section.is_active = :isActive', { isActive: true });

            // Aplicar filtros de búsqueda si se proporcionan
            if (search) {
                queryBuilder.andWhere(
                    '(section.name ILIKE :search OR event.title ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Aplicar ordenamiento y paginación
            queryBuilder
                .orderBy(`section.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [sections, total] = await queryBuilder.getManyAndCount();

            return createApiResponse(
                HttpStatus.OK,
                sections,
                'Secciones recuperadas correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.findAll',
                action: 'read',
                entityName: 'Section',
                additionalInfo: {
                    message: 'Error al recuperar secciones'
                }
            });
        }
    }

    /**
     * Obtener secciones por evento con paginación
     */
    async findAllSectionByEvent(eventId: string, userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Section[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                search = '',
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            // Verificar que el evento existe y pertenece al tenant
            const eventExists = await this.eventRepository.findOne({
                where: {
                    id: eventId,
                    is_active: true
                }
            });

            if (!eventExists) {
                throw new NotFoundException(`Evento con ID ${eventId} no encontrado o no accesible`);
            }

            const skip = page ? (page - 1) * limit : offset;

            // Construir la consulta con QueryBuilder
            const queryBuilder = this.sectionRepository.createQueryBuilder('section')
                .leftJoinAndSelect('section.tickets', 'ticket')
                .where('section.event.id = :eventId', { eventId })
                .andWhere('section.is_active = :isActive', { isActive: true });

            // Aplicar filtros de búsqueda si se proporcionan
            if (search) {
                queryBuilder.andWhere(
                    'section.name ILIKE :search',
                    { search: `%${search}%` }
                );
            }

            // Aplicar ordenamiento y paginación
            queryBuilder
                .orderBy(`section.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [sections, total] = await queryBuilder.getManyAndCount();

            return createApiResponse(
                HttpStatus.OK,
                sections,
                `Secciones del evento ${eventId} recuperadas correctamente`,
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.findAllSectionByEvent',
                action: 'read',
                entityName: 'Section',
                additionalInfo: {
                    eventId,
                    message: 'Error al recuperar secciones por evento'
                }
            });
        }
    }

    /**
     * Obtener una sección por ID
     */
    async findOne(id: string, userId: string): Promise<ApiResponse<Section>> {
        try {
            const section = await this.sectionRepository.findOne({
                where: {
                    id,
                    is_active: true
                },
                relations: ['event', 'tickets']
            });

            console.log('section?>>???????????????????????????', section);

            if (!section) {
                throw new NotFoundException(`Sección con ID ${id} no encontrada`);
            }

            return createApiResponse(HttpStatus.OK, section, 'Sección recuperada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.findOne',
                action: 'read',
                entityName: 'Section',
                entityId: id,
                additionalInfo: {
                    message: 'Error al recuperar sección'
                }
            });
        }
    }

    /**
     * Actualizar una sección
     */
    async patch(id: string, updateSectionDto: UpdateSectionDto, userId: string): Promise<ApiResponse<Section>> {
        try {
            const findSection = await this.sectionRepository.findOne({
                where: {
                    id,
                    is_active: true
                },
                relations: ['event']
            });

            if (!findSection) {
                throw new NotFoundException(`Sección con ID ${id} no encontrada`);
            }

            // Verificar eventId si se proporciona
            let targetEvent = findSection.event;
            if (updateSectionDto.eventId) {
                const newEvent = await this.eventRepository.findOne({
                    where: {
                        id: updateSectionDto.eventId,
                        is_active: true
                    }
                });

                if (!newEvent) {
                    throw new BadRequestException(`Evento con ID ${updateSectionDto.eventId} no encontrado o no pertenece a este inquilino`);
                }

                targetEvent = newEvent;
            }

            // Validaciones
            if (updateSectionDto.capacity !== undefined && updateSectionDto.capacity < 0) {
                throw new BadRequestException('La capacidad no puede ser negativa');
            }

            if (updateSectionDto.price !== undefined && updateSectionDto.price < 0) {
                throw new BadRequestException('El precio no puede ser negativo');
            }

            // Separar campos
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { eventId, ...sectionDetails } = updateSectionDto;

            // Guardar valores antiguos para auditoría
            const oldValues = { ...findSection };

            // Precargar la entidad con los cambios
            const section = await this.sectionRepository.preload({
                id,
                ...sectionDetails,
                ...(targetEvent !== findSection.event ? { event: targetEvent } : {}),
                updated_at: new Date()
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${id} no encontrada`);
            }

            await this.sectionRepository.save(section);

            // Recuperar la sección actualizada con relaciones
            const findUpdatedSection = await this.sectionRepository.findOne({
                where: { id },
                relations: ['event', 'tickets']
            });

            // Si se actualizó el precio, actualizar los tickets que aún no han sido modificados
            if (updateSectionDto.price !== undefined && updateSectionDto.price !== oldValues.price) {
                await this.updateUnmodifiedTicketPrices(id, updateSectionDto.price, userId);
            }

            return createApiResponse(HttpStatus.OK, findUpdatedSection, 'Sección actualizada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.patch',
                action: 'update',
                entityName: 'Section',
                entityId: id,
                additionalInfo: {
                    dto: updateSectionDto,
                    message: 'Error al actualizar sección'
                }
            });
        }
    }

    /**
     * Actualizar tickets sin modificaciones cuando cambia el precio de la sección
     */
    private async updateUnmodifiedTicketPrices(
        sectionId: string,
        newPrice: number,
        userId: string
    ): Promise<void> {
        try {
            // Obtener tickets de la sección
            const ticketsResponse = await this.ticketService.getTicketsBySection(sectionId, userId);
            const tickets = ticketsResponse.data;

            if (!tickets || tickets.length === 0) {
                return; // No hay tickets para actualizar
            }

            // Actualizar solo los tickets que no tienen modificaciones personalizadas
            const ticketsToUpdate = tickets.filter(ticket =>
                ticket.modificationType === null || ticket.modificationType === undefined
            );

            for (const ticket of ticketsToUpdate) {
                // Actualizar el precio pero mantener los otros campos
                await this.ticketRepository.update(ticket.id, {
                    price: newPrice,
                    originalPrice: newPrice, // También actualizar el precio original
                    updated_at: new Date()
                });
            }

            // No necesitamos registrar en auditoría porque ya estamos en un contexto de auditoría
        } catch (error) {
            console.error('Error al actualizar precios de tickets sin modificaciones:', error);
            // No propagamos el error para evitar interrumpir la actualización de la sección
        }
    }

    /**
     * Actualizar los precios de todos los tickets de una sección
     */
    async updateTicketPrices(
        sectionId: string,
        updateTicketPriceDto: UpdateTicketPriceDto,
        userId: string
    ): Promise<ApiResponse<{ updated: number }>> {
        try {
            // Verificar que la sección existe
            const sectionResponse = await this.findOne(sectionId, userId);
            if (!sectionResponse || !sectionResponse.data) {
                throw new NotFoundException(`Sección con ID ${sectionId} no encontrada`);
            }

            // Usar el servicio de tickets para actualizar los precios
            return this.ticketService.updatePriceBySection(
                sectionId,
                updateTicketPriceDto,
                userId
            );
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.updateTicketPrices',
                action: 'update',
                entityName: 'Section',
                entityId: sectionId,
                additionalInfo: {
                    dto: updateTicketPriceDto,
                    message: 'Error al actualizar precios de tickets por sección'
                }
            });
        }
    }

    /**
     * Crear tickets para una sección
     */
    async createTickets(
        sectionId: string,
        quantity: number,
        userId: string
    ): Promise<ApiResponse<{ created: number }>> {
        try {
            // Verificar que la sección existe
            console.log('Creating tickets for section:', sectionId, 'Quantity:', quantity);
            const sectionResponse = await this.findOne(sectionId, userId);
            console.log('sectionResponse????????????????????????????????????????????????', sectionResponse);

            if (!sectionResponse || !sectionResponse.data) {
                throw new NotFoundException(`Sección con ID ${sectionId} no encontrada`);
            }

            const section = sectionResponse.data;

            // Verificar que no se supere la capacidad
            const existingTickets = await this.ticketService.getTicketsBySection(sectionId, userId);
            const currentTicketsCount = existingTickets.data?.length || 0;

            if (currentTicketsCount + quantity > section.capacity) {
                throw new BadRequestException(`No se pueden crear ${quantity} tickets. Excedería la capacidad de la sección (${section.capacity})`);
            }

            // Crear tickets
            let createdCount = 0;
            for (let i = 0; i < quantity; i++) {
                await this.ticketService.createFromSection(sectionId, userId);
                createdCount++;
            }

            return createApiResponse(HttpStatus.CREATED, { created: createdCount }, `Se crearon ${createdCount} tickets para la sección ${sectionId}`);
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.createTickets',
                action: 'create',
                entityName: 'Ticket',
                additionalInfo: {
                    sectionId,
                    quantity,
                    message: 'Error al crear tickets para la sección'
                }
            });
        }
    }

    /**
     * Eliminar una sección (soft delete)
     */
    async remove(id: string, userId: string): Promise<ApiResponse<void>> {
        try {
            const section = await this.sectionRepository.findOne({
                where: {
                    id,
                    is_active: true
                },
                relations: ['tickets']
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${id} no encontrada`);
            }

            // Guardar valores antiguos para auditoría
            const oldValues = { ...section };

            // Verificar si tiene tickets asociados
            if (section.tickets && section.tickets.length > 0) {
                // Si hay tickets, desactivar la sección en lugar de eliminarla
                await this.sectionRepository.update(id, {
                    is_active: false,
                    updated_at: new Date()
                });
            } else {
                // Si no hay tickets, eliminar físicamente
                await this.sectionRepository.delete(id);
            }

            return createApiResponse(HttpStatus.OK, null, 'Sección eliminada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.remove',
                action: 'delete',
                entityName: 'Section',
                entityId: id,
                additionalInfo: {
                    message: 'Error al eliminar sección'
                }
            });
        }
    }

    /**
     * Obtener disponibilidad de una sección
     */
    async getAvailability(id: string, userId: string): Promise<ApiResponse<{ capacity: number, available: number, sold: number }>> {
        try {
            const section = await this.sectionRepository.findOne({
                where: {
                    id,
                    is_active: true
                },
                relations: ['tickets']
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${id} no encontrada`);
            }

            // Calcular tickets usados por disponibilidad
            const sold = section.tickets?.filter(ticket => !ticket.is_active).length || 0;
            const capacity = section.capacity;
            const available = Math.max(capacity - sold, 0);

            return createApiResponse(HttpStatus.OK, {
                capacity,
                available,
                sold
            }, 'Disponibilidad de la sección recuperada correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.getAvailability',
                action: 'read',
                entityName: 'Section',
                entityId: id,
                additionalInfo: {
                    message: 'Error al obtener disponibilidad de sección'
                }
            });
        }
    }

    /**
     * Obtener estadísticas de secciones por evento
     */
    async getSectionStatistics(eventId: string, userId: string): Promise<ApiResponse<any>> {
        try {
            // Verificar que el evento existe y pertenece al tenant
            const event = await this.eventRepository.findOne({
                where: {
                    id: eventId,
                    is_active: true
                }
            });

            if (!event) {
                throw new NotFoundException(`Evento con ID ${eventId} no encontrado o no accesible`);
            }

            // Total de secciones para este evento
            const totalSections = await this.sectionRepository.count({
                where: {
                    event: { id: eventId },
                    is_active: true
                }
            });

            // Secciones con mayor capacidad (top 5)
            const sectionsByCapacity = await this.sectionRepository
                .createQueryBuilder('section')
                .where('section.eventId = :eventId', { eventId })
                .andWhere('section.is_active = :isActive', { isActive: true })
                .orderBy('section.capacity', 'DESC')
                .limit(5)
                .getMany();

            // Secciones con más tickets vendidos
            const sectionsWithTickets = await this.sectionRepository
                .createQueryBuilder('section')
                .leftJoin('section.tickets', 'ticket')
                .where('section.eventId = :eventId', { eventId })
                .andWhere('section.is_active = :isActive', { isActive: true })
                .select('section.id', 'id')
                .addSelect('section.name', 'name')
                .addSelect('SUM(CASE WHEN ticket.is_active = false THEN 1 ELSE 0 END)', 'sold')
                .groupBy('section.id')
                .addGroupBy('section.name')
                .orderBy('sold', 'DESC')
                .limit(5)
                .getRawMany();

            // Capacidad total y vendida para el evento
            const capacityStats = await this.sectionRepository
                .createQueryBuilder('section')
                .leftJoin('section.tickets', 'ticket')
                .where('section.eventId = :eventId', { eventId })
                .andWhere('section.is_active = :isActive', { isActive: true })
                .select('SUM(section.capacity)', 'totalCapacity')
                .addSelect('SUM(CASE WHEN ticket.is_active = false THEN 1 ELSE 0 END)', 'totalSold')
                .getRawOne();

            const statistics = {
                eventId,
                totalSections,
                totalCapacity: Number(capacityStats?.totalCapacity || 0),
                totalSold: Number(capacityStats?.totalSold || 0),
                availableCapacity: Number(capacityStats?.totalCapacity || 0) - Number(capacityStats?.totalSold || 0),
                sectionsByCapacity,
                sectionsWithMostSales: sectionsWithTickets
            };


            return createApiResponse(HttpStatus.OK, statistics, `Estadísticas de secciones para el evento ${eventId} obtenidas correctamente`);
        } catch (error) {
            throw handleError(error, {
                context: 'SectionService.getSectionStatistics',
                action: 'query',
                entityName: 'Section',
                additionalInfo: {
                    eventId,
                    message: 'Error al obtener estadísticas de secciones'
                }
            });
        }
    }
}