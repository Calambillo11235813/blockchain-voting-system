import { BadRequestException, Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Section } from '../entities/section.entity';
import { MemberTenantService } from 'src/tenant/services/member-tenant.service';
import { AuditService } from 'src/audit/services/audit.service';
import { CreateTicketDto } from '../dto/ticket/create-ticket.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { ActionType } from 'src/audit/entities/audit.entity';
import { handleError } from 'src/common/helpers/function-helper';
import { UpdateTicketDto } from '../dto/ticket/update-ticket.dto';
import { UpdateTicketPriceDto } from '../dto/ticket/update-price-ticket.dto';
import { PriceModificationType } from 'src/common/enums/price-modification-type-enum/price-modification-type.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BulkUpdateTicketPriceDto } from '../dto/ticket/bulk-update-price.dto';
import { toBoliviaTime } from 'src/common/utils/transform-time.util';
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';
import { PurchaseStatus } from 'src/common/enums/purchase-status/purchase-status.enum';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode-reader';
import { Jimp } from 'jimp';
import { TicketValidatorContractService } from 'src/blockchain/services/ticket-validator-contract.service';
import { ValidateTicketDto } from '../dto/ticket/validate-ticket.dto';

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private ticketRepository: Repository<Ticket>,
        @InjectRepository(Section)
        private sectionRepository: Repository<Section>,
        @InjectRepository(TicketPurchase)
        private ticketPurchaseRepository: Repository<TicketPurchase>,
        private memberTenantService: MemberTenantService,
        private auditService: AuditService,
        private ticketValidatorContractService: TicketValidatorContractService
    ) { }

    /**
     * Crear ticket a partir de un DTO
     */
    async create(createTicketDto: CreateTicketDto & { section?: Section }, userId: string, memberTenantId: string): Promise<ApiResponse<Ticket>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Usar la sección que viene del pipe o buscarla por sectionId
            let section = createTicketDto.section;
            if (!section && createTicketDto.sectionId) {
                section = await this.sectionRepository.findOne({
                    where: {
                        id: createTicketDto.sectionId,
                        tenantId,
                        is_active: true
                    },
                    relations: ['event']
                });

                if (!section) {
                    throw new NotFoundException(`Sección con ID ${createTicketDto.sectionId} no encontrada`);
                }
            }

            if (!section) {
                throw new BadRequestException('Se requiere una sección válida para crear un ticket');
            }

            // Crear un ticket basado en la sección
            const ticket = this.ticketRepository.create({
                tenantId,
                section,
                price: section.price,
                originalPrice: section.price,
                date: createTicketDto.date || new Date(),
                is_active: true
            });

            await this.ticketRepository.save(ticket);

            // Recuperar el ticket guardado con relaciones
            const savedTicket = await this.ticketRepository.findOne({
                where: { id: ticket.id },
                relations: ['section', 'section.event']
            });

            await this.auditService.logAction(
                ActionType.CREATE,
                'Ticket',
                ticket.id,
                userId,
                tenantId,
                {},
                savedTicket
            );

            return createApiResponse(HttpStatus.CREATED, savedTicket, 'Ticket creado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.create',
                action: 'create',
                entityName: 'Ticket',
                additionalInfo: {
                    dto: { ...createTicketDto, section: undefined },
                    message: 'Error al crear ticket'
                }
            });
        }
    }

    /**
     * Crear ticket directamente a partir de una sección
     */
    async createFromSection(sectionId: string, userId: string, memberTenantId: string): Promise<ApiResponse<Ticket>> {
        const createTicketDto = new CreateTicketDto();
        createTicketDto.sectionId = sectionId;
        createTicketDto.date = new Date();
        return this.create(createTicketDto, userId, memberTenantId);
    }

    /**
     * Obtener un ticket por ID
     */
    async findOne(id: string, userId: string, memberTenantId: string): Promise<ApiResponse<Ticket>> {
        try {

            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            const ticket = await this.ticketRepository.findOne({
                where: {
                    id,
                    tenantId,
                    is_active: true
                },
                relations: ['section', 'section.event']
            });

            if (!ticket) {
                throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
            }

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Ticket',
                id,
                userId,
                tenantId,
                null,
                null
            );

            return createApiResponse(HttpStatus.OK, ticket, 'Ticket recuperado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.findOne',
                action: 'read',
                entityName: 'Ticket',
                entityId: id,
                additionalInfo: {
                    message: 'Error al recuperar ticket'
                }
            });
        }
    }

    /**
     * Obtener todos los tickets con paginación
     */
    async findAll(userId: string, memberTenantId: string, paginationDto: PaginationDto): Promise<ApiResponse<Ticket[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                search = '',
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            const skip = page ? (page - 1) * limit : offset;

            // Construir la consulta con QueryBuilder para mayor flexibilidad
            const queryBuilder = this.ticketRepository.createQueryBuilder('ticket')
                .leftJoinAndSelect('ticket.section', 'section')
                .leftJoinAndSelect('section.event', 'event')
                .where('ticket.tenantId = :tenantId', { tenantId })
                .andWhere('ticket.is_active = :isActive', { isActive: true });

            // Aplicar filtros de búsqueda si se proporcionan
            if (search) {
                queryBuilder.andWhere(
                    '(section.name ILIKE :search OR event.title ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Aplicar ordenamiento y paginación
            queryBuilder
                .orderBy(`ticket.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [tickets, total] = await queryBuilder.getManyAndCount();

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Ticket',
                null,
                userId,
                tenantId,
                null,
                null
            );

            return createApiResponse(
                HttpStatus.OK,
                tickets,
                'Tickets recuperados correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.findAll',
                action: 'read',
                entityName: 'Ticket',
                additionalInfo: {
                    message: 'Error al recuperar tickets'
                }
            });
        }
    }

    /**
     * Encontrar tickets por sección con paginación
     */
    async findBySection(sectionId: string, userId: string, memberTenantId: string, paginationDto: PaginationDto): Promise<ApiResponse<Ticket[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Verificar que la sección existe y pertenece al tenant
            const section = await this.sectionRepository.findOne({
                where: {
                    id: sectionId,
                    tenantId,
                    is_active: true
                }
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${sectionId} no encontrada o no accesible`);
            }

            const skip = page ? (page - 1) * limit : offset;

            // Construir consulta con QueryBuilder
            const queryBuilder = this.ticketRepository.createQueryBuilder('ticket')
                .innerJoin('ticket.section', 'section', 'section.id = :sectionId', { sectionId })
                .leftJoinAndSelect('ticket.ticketPurchases', 'ticketPurchase')
                .where('ticket.tenantId = :tenantId', { tenantId })
                .andWhere('ticket.is_active = :isActive', { isActive: true })
                .orderBy(`ticket.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [tickets, total] = await queryBuilder.getManyAndCount();

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Ticket',
                null,
                userId,
                tenantId,
                { sectionId },
                null
            );

            return createApiResponse(
                HttpStatus.OK,
                tickets,
                `Tickets de la sección ${sectionId} recuperados correctamente`,
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.findBySection',
                action: 'read',
                entityName: 'Ticket',
                additionalInfo: {
                    sectionId,
                    message: 'Error al recuperar tickets por sección'
                }
            });
        }
    }

    /**
     * Actualizar un ticket
     */
    async patch(id: string, updateTicketDto: UpdateTicketDto & { section?: Section }, userId: string, memberTenantId: string): Promise<ApiResponse<Ticket>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            const ticket = await this.ticketRepository.findOne({
                where: {
                    id,
                    tenantId,
                    is_active: true
                },
                relations: ['section']
            });

            if (!ticket) {
                throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
            }

            // Guardar valores anteriores para auditoría
            const oldValues = { ...ticket };

            // Preparar datos para la actualización
            const newSection = updateTicketDto.section;
            if (updateTicketDto.section) {
                delete updateTicketDto.section; // Eliminar para usar sólo en la asignación
            }

            // Preload para actualizar entidad con relaciones
            const updatedTicket = await this.ticketRepository.preload({
                id,
                ...updateTicketDto,
                ...(newSection ? { section: newSection } : {}),
                updated_at: new Date()
            });

            if (!updatedTicket) {
                throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
            }

            await this.ticketRepository.save(updatedTicket);

            // Obtener el ticket actualizado con todas sus relaciones
            const result = await this.ticketRepository.findOne({
                where: { id },
                relations: ['section', 'section.event', 'ticketPurchases']
            });

            // Registrar acción de auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Ticket',
                id,
                userId,
                tenantId,
                oldValues,
                result
            );

            return createApiResponse(HttpStatus.OK, result, 'Ticket actualizado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.patch',
                action: 'update',
                entityName: 'Ticket',
                entityId: id,
                additionalInfo: {
                    dto: { ...updateTicketDto, section: undefined },
                    message: 'Error al actualizar ticket'
                }
            });
        }
    }

    /**
     * Actualizar precio de ticket con justificación
     */
    async updateTicketPrice(
        ticketId: string,
        updateTicketPriceDto: UpdateTicketPriceDto,
        userId: string,
        memberTenantId: string
    ): Promise<ApiResponse<Ticket>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Buscar el ticket
            const ticket = await this.ticketRepository.findOne({
                where: {
                    id: ticketId,
                    tenantId,
                    is_active: true
                },
                relations: ['section', 'section.event']
            });

            if (!ticket) {
                throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
            }

            // Validaciones específicas según el tipo de modificación
            this.validatePriceModification(updateTicketPriceDto, ticket);

            // Guardar valores anteriores para auditoría
            const oldValues = { ...ticket };

            // Actualizar el ticket con el nuevo precio
            const updatedTicket = await this.ticketRepository.preload({
                id: ticketId,
                price: updateTicketPriceDto.price,
                modificationType: updateTicketPriceDto.modificationType,
                validFrom: updateTicketPriceDto.validFrom || new Date(),
                validUntil: updateTicketPriceDto.validUntil,
                updated_at: new Date()
            });

            if (!updatedTicket) {
                throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
            }

            await this.ticketRepository.save(updatedTicket);

            // Obtener el ticket actualizado con todas sus relaciones
            const result = await this.ticketRepository.findOne({
                where: { id: ticketId },
                relations: ['section', 'section.event']
            });

            // Registrar la modificación de precio en la auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Ticket',
                ticketId,
                userId,
                tenantId,
                oldValues,
                result
            );

            return createApiResponse(HttpStatus.OK, result, `Precio de ticket actualizado correctamente por ${updateTicketPriceDto.modificationType}`);
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.updateTicketPrice',
                action: 'update',
                entityName: 'Ticket',
                entityId: ticketId,
                additionalInfo: {
                    dto: updateTicketPriceDto,
                    message: 'Error al actualizar precio del ticket'
                }
            });
        }
    }

    /**
     * Validaciones específicas según el tipo de modificación
     */
    private validatePriceModification(dto: UpdateTicketPriceDto, ticket: Ticket): void {
        const now = new Date();

        // Validar fechas si se proporcionan
        if (dto.validFrom && dto.validUntil) {
            const validFrom = new Date(dto.validFrom);
            const validUntil = new Date(dto.validUntil);

            if (validFrom > validUntil) {
                throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
            }
        }

        // Validar que no haya promociones superpuestas
        if (dto.validFrom && dto.validUntil && ticket.validUntil && new Date(ticket.validUntil) > now) {
            if (
                (new Date(dto.validFrom) <= new Date(ticket.validUntil)) &&
                (ticket.validFrom ? new Date(ticket.validFrom) <= new Date(dto.validUntil) : true)
            ) {
                throw new BadRequestException('Ya existe una promoción activa para este ticket en el período especificado');
            }
        }

        // Validaciones específicas por tipo de modificación
        switch (dto.modificationType) {
            case PriceModificationType.PRESALE:
                // Verificar que el precio de preventa sea menor al precio original
                if (dto.price >= ticket.originalPrice) {
                    throw new BadRequestException('El precio de preventa debe ser menor al precio original');
                }
                break;

            case PriceModificationType.DISCOUNT:
            case PriceModificationType.PROMOTION:
            case PriceModificationType.SPECIAL_OFFER:
                // Verificar que el descuento no sea demasiado alto (por ejemplo, más del 50%)
                if (dto.price < ticket.originalPrice * 0.5) {
                    throw new BadRequestException('El descuento no puede ser mayor al 50% del precio original');
                }
                break;

            case PriceModificationType.GROUP_DISCOUNT:
                // Para descuentos de grupo, validar que haya una fecha límite
                if (!dto.validUntil) {
                    throw new BadRequestException('Los descuentos de grupo deben tener una fecha límite');
                }
                break;

            case PriceModificationType.EARLY_BIRD:
                // Verificar que sea antes del evento
                if (!ticket.section.event || !dto.validUntil) {
                    throw new BadRequestException('Early Bird requiere una fecha límite y estar asociado a un evento');
                }

                // Verificar que validUntil sea antes de la fecha del evento
                const eventDate = new Date(ticket.section.event.start_date);
                if (dto.validUntil && new Date(dto.validUntil) >= eventDate) {
                    throw new BadRequestException('Early Bird debe terminar antes de la fecha de inicio del evento');
                }
                break;
        }
    }

    /**
     * Método para actualizar los tickets de una sección específica
     */
    async updatePriceBySection(
        sectionId: string,
        updateTicketPriceDto: UpdateTicketPriceDto,
        userId: string,
        memberTenantId: string
    ): Promise<ApiResponse<{ updated: number }>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Verificar que la sección existe
            const section = await this.sectionRepository.findOne({
                where: {
                    id: sectionId,
                    tenantId,
                    is_active: true
                }
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${sectionId} no encontrada`);
            }

            // Buscar todos los tickets asociados a esa sección
            const tickets = await this.ticketRepository.find({
                where: {
                    section: { id: sectionId },
                    tenantId,
                    is_active: true
                }
            });

            if (tickets.length === 0) {
                throw new NotFoundException(`No se encontraron tickets activos para la sección ${sectionId}`);
            }

            // Convertir las fechas a horario boliviano
            const validFrom = toBoliviaTime(updateTicketPriceDto.validFrom);
            const validUntil = toBoliviaTime(updateTicketPriceDto.validUntil);

            // Actualizar todos los tickets usando preload
            let updatedCount = 0;
            const updatedTickets = [];

            for (const ticket of tickets) {
                // Usar preload para preparar la actualización
                const preloadedTicket = await this.ticketRepository.preload({
                    id: ticket.id,
                    price: updateTicketPriceDto.price,
                    modificationType: updateTicketPriceDto.modificationType,
                    validFrom: validFrom,
                    validUntil: validUntil,
                    updated_at: new Date()
                });

                if (preloadedTicket) {
                    updatedTickets.push(preloadedTicket);
                    updatedCount++;
                }
            }

            // Guardar todos los tickets actualizados en una sola operación
            if (updatedTickets.length > 0) {
                await this.ticketRepository.save(updatedTickets);
            }

            // Registrar auditoría para la operación completa
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Ticket',
                sectionId,
                userId,
                tenantId,
                {
                    price: tickets[0].price,
                    modificationType: tickets[0].modificationType
                },
                { // Valores nuevos
                    price: updateTicketPriceDto.price,
                    modificationType: updateTicketPriceDto.modificationType,
                    ticketsUpdated: updatedCount
                }
            );

            return createApiResponse(HttpStatus.OK, { updated: updatedCount }, `Se actualizaron ${updatedCount} tickets de la sección ${sectionId}`);
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.updatePriceBySection',
                action: 'update',
                entityName: 'Ticket',
                additionalInfo: {
                    sectionId,
                    dto: updateTicketPriceDto,
                    message: 'Error al actualizar precios por sección'
                }
            });
        }
    }

    /**
     * Eliminar un ticket (soft delete)
     */
    async remove(id: string, userId: string, memberTenantId: string): Promise<ApiResponse<void>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            const ticket = await this.ticketRepository.findOne({
                where: {
                    id,
                    tenantId,
                    is_active: true
                }
            });

            if (!ticket) {
                throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
            }

            // Guardar valores antiguos para auditoría
            const oldValues = { ...ticket };

            // Soft delete (cambiar estado)
            await this.ticketRepository.update(id, {
                is_active: false,
                updated_at: new Date()
            });

            // Registrar acción de auditoría
            await this.auditService.logAction(
                ActionType.DELETE,
                'Ticket',
                id,
                userId,
                tenantId,
                oldValues,
                { id, is_active: false }
            );

            return createApiResponse(HttpStatus.OK, null, 'Ticket eliminado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.remove',
                action: 'delete',
                entityName: 'Ticket',
                entityId: id,
                additionalInfo: {
                    message: 'Error al eliminar ticket'
                }
            });
        }
    }

    /**
     * Obtener tickets por sección
     * @deprecated Use findBySection instead which includes pagination
     */
    async getTicketsBySection(sectionId: string, userId: string, memberTenantId: string): Promise<ApiResponse<Ticket[]>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Verificar que la sección existe y pertenece al tenant
            const section = await this.sectionRepository.findOne({
                where: {
                    id: sectionId,
                    tenantId,
                    is_active: true
                }
            });

            if (!section) {
                throw new NotFoundException(`Sección con ID ${sectionId} no encontrada o no accesible`);
            }

            const tickets = await this.ticketRepository.find({
                where: {
                    section: { id: sectionId },
                    tenantId,
                    is_active: true
                },
                relations: ['ticketPurchases']
            });

            return createApiResponse(HttpStatus.OK, tickets, `Tickets de la sección ${sectionId} recuperados correctamente`);
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.getTicketsBySection',
                action: 'read',
                entityName: 'Ticket',
                additionalInfo: {
                    sectionId,
                    message: 'Error al recuperar tickets por sección'
                }
            });
        }
    }


    // async validateTicket(
    //     qrImageData: string, // Recibe la imagen en base64
    //     userId: string,
    //     memberTenantId: string
    // ): Promise<ApiResponse<any>> {
    //     try {

    //         console.log(qrImageData, userId, memberTenantId, ':::::::::::::::::::::::::::::::::::');
    //         const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
    //         if (!existMembertenant) {
    //             throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
    //         }

    //         const tenantId = existMembertenant.data.tenantId;

    //         // Decodificar la imagen del QR
    //         let qrPayload;
    //         try {
    //             // Extraer la parte base64 real si viene con prefijo data:image
    //             let base64Data = qrImageData;
    //             if (base64Data.startsWith('data:image')) {
    //                 base64Data = base64Data.split(',')[1];
    //             }

    //             // Decodificar la imagen
    //             const qrText = await this.decodeQRFromBase64(base64Data);

    //             console.log('QR decodificado:', qrText);
    //             if (!qrText) {
    //                 return createApiResponse(HttpStatus.BAD_REQUEST, {
    //                     isValid: false,
    //                     message: 'No se pudo decodificar ningún QR de la imagen'
    //                 }, 'Validación de ticket completada');
    //             }

    //             // Parsear el contenido del QR
    //             qrPayload = JSON.parse(qrText);
    //         } catch (e) {
    //             console.error('Error al decodificar QR:', e);
    //             return createApiResponse(HttpStatus.BAD_REQUEST, {
    //                 isValid: false,
    //                 message: 'Error al procesar la imagen del QR: ' + e.message
    //             }, 'Validación de ticket completada');
    //         }

    //         // Validar que el QR contenga datos necesarios
    //         if (!qrPayload.purchaseId || !qrPayload.ticketId) {
    //             return createApiResponse(HttpStatus.BAD_REQUEST, {
    //                 isValid: false,
    //                 message: 'QR inválido: datos insuficientes'
    //             }, 'Validación de ticket completada');
    //         }

    //         // Buscar el ticket-purchase asociado
    //         const ticketPurchase = await this.ticketPurchaseRepository.findOne({
    //             where: {
    //                 id: qrPayload.ticketId,
    //                 purchase: { id: qrPayload.purchaseId },
    //                 tenantId
    //             },
    //             relations: ['ticket', 'ticket.section', 'purchase']
    //         });

    //         if (!ticketPurchase) {
    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: false,
    //                 message: 'Ticket no encontrado o no pertenece a este tenant'
    //             }, 'Validación de ticket completada');
    //         }

    //         // Verificar que la compra esté pagada
    //         if (ticketPurchase.purchase.status !== PurchaseStatus.PAID) {
    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: false,
    //                 message: 'Este ticket no ha sido pagado'
    //             }, 'Validación de ticket completada');
    //         }

    //         // Verificar si el ticket ya ha sido usado
    //         if (ticketPurchase.is_used) {
    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: false,
    //                 message: 'Este ticket ya ha sido utilizado',
    //                 usedAt: ticketPurchase.validated_at
    //             }, 'Validación de ticket completada');
    //         }

    //         // Verificar la sección
    //         const ticket = ticketPurchase.ticket;
    //         if (!ticket.section) {
    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: false,
    //                 message: 'Este ticket no tiene una sección válida'
    //             }, 'Validación de ticket completada');
    //         }

    //         // Marcar el ticket como usado
    //         ticketPurchase.is_used = true;
    //         ticketPurchase.validated_at = new Date();

    //         await this.ticketPurchaseRepository.save(ticketPurchase);

    //         // Registrar auditoría
    //         await this.auditService.logAction(
    //             ActionType.UPDATE,
    //             'TicketPurchase',
    //             ticketPurchase.id,
    //             userId,
    //             tenantId,
    //             { is_used: false },
    //             { is_used: true, validated_at: ticketPurchase.validated_at }
    //         );


    //         // Registrar la validación en blockchain
    //         try {
    //             const eventId = ticket.section.event?.id || 'unknown-event';
    //             const sectionName = ticket.section.name || 'Sin sección';

    //             // Llamar al servicio de blockchain para registrar la validación
    //             const blockchainResult = await this.ticketValidatorContractService.registerTicketValidation(
    //                 memberTenantId,
    //                 ticketPurchase.id,
    //                 ticketPurchase.purchase.id,
    //                 userId,
    //                 eventId,
    //                 sectionName
    //             );

    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: true,
    //                 message: 'Ticket validado correctamente y registrado en blockchain',
    //                 ticketData: {
    //                     ticketId: ticketPurchase.id,
    //                     section: {
    //                         name: ticket.section.name,
    //                         id: ticket.section.id
    //                     },
    //                     validatedAt: ticketPurchase.validated_at,
    //                     blockchain: {
    //                         txHash: blockchainResult.txHash,
    //                         validationHash: blockchainResult.validationHash
    //                     }
    //                 }
    //             }, 'Validación de ticket completada');
    //         } catch (blockchainError) {
    //             console.error('Error al registrar en blockchain:', blockchainError);

    //             return createApiResponse(HttpStatus.OK, {
    //                 isValid: true,
    //                 message: 'Ticket validado correctamente, pero hubo un problema al registrar en blockchain',
    //                 error: blockchainError.message,
    //                 ticketData: {
    //                     ticketId: ticketPurchase.id,
    //                     section: {
    //                         name: ticket.section.name,
    //                         id: ticket.section.id
    //                     },
    //                     validatedAt: ticketPurchase.validated_at
    //                 }
    //             }, 'Validación de ticket completada con advertencias');
    //         }

    //     } catch (error) {
    //         console.error('Error en validateTicket:', error);
    //         return createApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
    //             isValid: false,
    //             message: 'Error al procesar la validación: ' + error.message
    //         }, 'Error en validación de ticket');
    //     }
    // }

    async validateTicket(
        ticketData: ValidateTicketDto,
        userId: string,
        memberTenantId: string
    ): Promise<ApiResponse<any>> {
        try {
            console.log('Datos recibidos:', ticketData, userId, memberTenantId);

            // Verificar membresía en el tenant
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Validar que el DTO contenga datos necesarios
            if (!ticketData.purchaseId || !ticketData.ticketId) {
                return createApiResponse(HttpStatus.BAD_REQUEST, {
                    isValid: false,
                    message: 'Datos inválidos: información de ticket insuficiente'
                }, 'Validación de ticket completada');
            }

            // Buscar el ticket-purchase asociado
            const ticketPurchase = await this.ticketPurchaseRepository.findOne({
                where: {
                    id: ticketData.ticketId,
                    purchase: { id: ticketData.purchaseId },
                    tenantId
                },
                relations: ['ticket', 'ticket.section', 'ticket.section.event', 'purchase']
            });

            if (!ticketPurchase) {
                return createApiResponse(HttpStatus.OK, {
                    isValid: false,
                    message: 'Ticket no encontrado o no pertenece a este tenant'
                }, 'Validación de ticket completada');
            }

            // Verificar que la compra esté pagada
            if (ticketPurchase.purchase.status !== PurchaseStatus.PAID) {
                return createApiResponse(HttpStatus.OK, {
                    isValid: false,
                    message: 'Este ticket no ha sido pagado'
                }, 'Validación de ticket completada');
            }

            // Verificar si el ticket ya ha sido usado
            if (ticketPurchase.is_used) {
                return createApiResponse(HttpStatus.OK, {
                    isValid: false,
                    message: 'Este ticket ya ha sido utilizado',
                    usedAt: ticketPurchase.validated_at
                }, 'Validación de ticket completada');
            }

            // Verificar la sección
            const ticket = ticketPurchase.ticket;
            if (!ticket.section) {
                return createApiResponse(HttpStatus.OK, {
                    isValid: false,
                    message: 'Este ticket no tiene una sección válida'
                }, 'Validación de ticket completada');
            }

            // Validar que la sección en el QR coincida con la sección real
            if (ticket.section.name !== ticketData.ticketSection) {
                return createApiResponse(HttpStatus.OK, {
                    isValid: false,
                    message: `La sección en el ticket (${ticketData.ticketSection}) no coincide con la registrada (${ticket.section.name})`
                }, 'Validación de ticket completada');
            }

            // Marcar el ticket como usado
            ticketPurchase.is_used = true;
            ticketPurchase.validated_at = new Date();

            await this.ticketPurchaseRepository.save(ticketPurchase);

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'TicketPurchase',
                ticketPurchase.id,
                userId,
                tenantId,
                { is_used: false },
                { is_used: true, validated_at: ticketPurchase.validated_at }
            );

            // Registrar la validación en blockchain
            try {
                const eventId = ticket.section.event?.id || 'unknown-event';
                const sectionName = ticket.section.name || 'Sin sección';

                // Llamar al servicio de blockchain para registrar la validación
                const blockchainResult = await this.ticketValidatorContractService.registerTicketValidation(
                    memberTenantId,
                    ticketPurchase.id,
                    ticketPurchase.purchase.id,
                    userId,
                    eventId,
                    sectionName
                );

                return createApiResponse(HttpStatus.OK, {
                    isValid: true,
                    message: 'Ticket validado correctamente y registrado en blockchain',
                    ticketData: {
                        ticketId: ticketPurchase.id,
                        section: {
                            name: ticket.section.name,
                            id: ticket.section.id
                        },
                        event: ticket.section.event ? {
                            address: ticket.section.event.address,
                            id: ticket.section.event.id,
                            date: ticket.section.event.start_date
                        } : null,
                        validatedAt: ticketPurchase.validated_at,
                        blockchain: {
                            txHash: blockchainResult.txHash,
                            validationHash: blockchainResult.validationHash
                        }
                    }
                }, 'Validación de ticket completada');
            } catch (blockchainError) {
                console.error('Error al registrar en blockchain:', blockchainError);

                return createApiResponse(HttpStatus.OK, {
                    isValid: true,
                    message: 'Ticket validado correctamente, pero hubo un problema al registrar en blockchain',
                    error: blockchainError.message,
                    ticketData: {
                        ticketId: ticketPurchase.id,
                        section: {
                            name: ticket.section.name,
                            id: ticket.section.id
                        },
                        event: ticket.section.event ? {
                            address: ticket.section.event.address,
                            id: ticket.section.event.id,
                            date: ticket.section.event.start_date
                        } : null,
                        validatedAt: ticketPurchase.validated_at
                    }
                }, 'Validación de ticket completada con advertencias');
            }

        } catch (error) {
            console.error('Error en validateTicket:', error);
            return createApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
                isValid: false,
                message: 'Error al procesar la validación: ' + error.message
            }, 'Error en validación de ticket');
        }
    }

    private async decodeQRFromBase64(base64Image: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const buffer = Buffer.from(base64Image, 'base64');

                Jimp.read(buffer)
                    .then(image => {
                        const qrReader = new QRCode();

                        qrReader.callback = (err, result) => {
                            if (err) {
                                console.error('Error decodificando QR:', err);
                                reject(err);
                                return;
                            }

                            if (!result || !result.result) {
                                reject(new Error('No se encontró ningún código QR'));
                                return;
                            }

                            resolve(result.result);
                        };

                        qrReader.decode(image.bitmap);
                    })
                    .catch(err => {
                        console.error('Error al leer la imagen con Jimp:', err);
                        reject(err);
                    });
            } catch (error) {
                console.error('Error general al decodificar QR:', error);
                reject(error);
            }
        });
    }

    // Método auxiliar para simular el registro en blockchain
    private simulateBlockchainRegistration(ticketPurchase: TicketPurchase, validatedBy: string): string {
        const data = {
            ticketId: ticketPurchase.id,
            purchaseId: ticketPurchase.purchase.id,
            validatedAt: ticketPurchase.validated_at,
            validatedBy,
            timestamp: Date.now()
        };

        const blockchainHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');

        console.log(`[Blockchain Simulation] Ticket validation registered with hash: ${blockchainHash}`);

        return blockchainHash;
    }


    /**
     * Obtener estadísticas de tickets
     */
    async getTicketStatistics(memberTenantId: string, userId: string): Promise<ApiResponse<any>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Total de tickets activos
            const totalActiveTickets = await this.ticketRepository.count({
                where: {
                    tenantId,
                    is_active: true
                }
            });

            // Total de tickets vendidos (con compras)
            const ticketsWithPurchases = await this.ticketRepository
                .createQueryBuilder('ticket')
                .leftJoin('ticket.ticketPurchases', 'tp')
                .where('ticket.tenantId = :tenantId', { tenantId })
                .andWhere('ticket.is_active = :isActive', { isActive: true })
                .andWhere('tp.id IS NOT NULL')
                .getCount();

            // Tickets por tipo de modificación
            const ticketsByModificationType = await this.ticketRepository
                .createQueryBuilder('ticket')
                .select('ticket.modificationType', 'type')
                .addSelect('COUNT(ticket.id)', 'count')
                .where('ticket.tenantId = :tenantId', { tenantId })
                .andWhere('ticket.is_active = :isActive', { isActive: true })
                .andWhere('ticket.modificationType IS NOT NULL')
                .groupBy('ticket.modificationType')
                .getRawMany();

            // Tickets por sección (top 5)
            const ticketsBySection = await this.ticketRepository
                .createQueryBuilder('ticket')
                .leftJoin('ticket.section', 'section')
                .select('section.id', 'sectionId')
                .addSelect('section.name', 'sectionName')
                .addSelect('COUNT(ticket.id)', 'count')
                .where('ticket.tenantId = :tenantId', { tenantId })
                .andWhere('ticket.is_active = :isActive', { isActive: true })
                .groupBy('section.id')
                .addGroupBy('section.name')
                .orderBy('"count"', 'DESC')
                .limit(5)
                .getRawMany();

            const statistics = {
                totalActiveTickets,
                ticketsWithPurchases,
                availableTickets: totalActiveTickets - ticketsWithPurchases,
                ticketsByModificationType,
                ticketsBySection
            };

            // Registrar la acción en el log de auditoría
            await this.auditService.logAction(
                ActionType.VIEW,
                'Ticket',
                null,
                userId,
                tenantId,
                null,
                { action: 'statistics' }
            );

            return createApiResponse(HttpStatus.OK, statistics, 'Estadísticas de tickets obtenidas correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.getTicketStatistics',
                action: 'query',
                entityName: 'Ticket',
                additionalInfo: {
                    memberTenantId,
                    message: 'Error al obtener estadísticas de tickets'
                }
            });
        }
    }


    /**
     * Actualizar precios de múltiples tickets en base a diferentes criterios
     */
    async updateBulkTicketPrices(
        bulkUpdateDto: BulkUpdateTicketPriceDto,
        userId: string,
        memberTenantId: string
    ): Promise<ApiResponse<{ updated: number }>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Construir la consulta base para encontrar tickets
            let ticketsToUpdate: Ticket[] = [];

            // Caso 1: IDs de tickets específicos
            if (bulkUpdateDto.ticketIds && bulkUpdateDto.ticketIds.length > 0) {
                ticketsToUpdate = await this.ticketRepository.find({
                    where: {
                        id: In(bulkUpdateDto.ticketIds),
                        tenantId,
                        is_active: true
                    },
                    relations: ['section', 'section.event']
                });

                if (ticketsToUpdate.length === 0) {
                    throw new NotFoundException('No se encontraron tickets con los IDs proporcionados');
                }
            }
            // Caso 2: Tickets de una sección específica
            else if (bulkUpdateDto.sectionId) {
                return this.updatePriceBySection(
                    bulkUpdateDto.sectionId,
                    {
                        price: bulkUpdateDto.price,
                        modificationType: bulkUpdateDto.modificationType,
                        validFrom: bulkUpdateDto.validFrom,
                        validUntil: bulkUpdateDto.validUntil
                    },
                    userId,
                    memberTenantId
                );
            }
            // Caso 3: Todos los tickets
            else {
                ticketsToUpdate = await this.ticketRepository.find({
                    where: {
                        tenantId,
                        is_active: true
                    },
                    relations: ['section', 'section.event']
                });

                if (ticketsToUpdate.length === 0) {
                    throw new NotFoundException('No se encontraron tickets activos');
                }
            }

            // Actualizar cada ticket
            let updatedCount = 0;
            for (const ticket of ticketsToUpdate) {
                try {
                    // Validar que el precio sea válido según el tipo de modificación
                    this.validatePriceModification({
                        price: bulkUpdateDto.price,
                        modificationType: bulkUpdateDto.modificationType,
                        validFrom: bulkUpdateDto.validFrom,
                        validUntil: bulkUpdateDto.validUntil
                    }, ticket);

                    // Actualizar el ticket
                    await this.ticketRepository.update(ticket.id, {
                        price: bulkUpdateDto.price,
                        modificationType: bulkUpdateDto.modificationType,
                        validFrom: bulkUpdateDto.validFrom || new Date(),
                        validUntil: bulkUpdateDto.validUntil,
                        updated_at: new Date()
                    });

                    updatedCount++;
                } catch (error) {
                    console.log(`Error al actualizar ticket ${ticket.id}: ${error.message}`);
                    // Continuar con los siguientes tickets aunque haya errores en algunos
                }
            }

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Ticket',
                null,
                userId,
                tenantId,
                { bulkUpdate: bulkUpdateDto },
                { updated: updatedCount, modificationType: bulkUpdateDto.modificationType }
            );

            return createApiResponse(HttpStatus.OK, { updated: updatedCount }, `Se actualizaron ${updatedCount} tickets con la modificación ${bulkUpdateDto.modificationType}`);
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.updateBulkTicketPrices',
                action: 'update',
                entityName: 'Ticket',
                additionalInfo: {
                    dto: bulkUpdateDto,
                    message: 'Error al actualizar precios de tickets en masa'
                }
            });
        }
    }

    /**
     * Restaurar precios originales de tickets
     */
    async restoreOriginalPrices(
        ticketIds: string[],
        sectionId: string,
        userId: string,
        memberTenantId: string
    ): Promise<ApiResponse<{ restored: number }>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Construir la consulta base para encontrar tickets
            let ticketsToRestore: Ticket[] = [];

            // Caso 1: IDs de tickets específicos
            if (ticketIds && ticketIds.length > 0) {
                ticketsToRestore = await this.ticketRepository.find({
                    where: {
                        id: In(ticketIds),
                        tenantId,
                        is_active: true
                    }
                });
            }
            // Caso 2: Tickets de una sección específica
            else if (sectionId) {
                ticketsToRestore = await this.ticketRepository.find({
                    where: {
                        section: { id: sectionId },
                        tenantId,
                        is_active: true
                    },
                    relations: ['section']
                });
            }
            // Caso 3: Todos los tickets
            else {
                ticketsToRestore = await this.ticketRepository.find({
                    where: {
                        tenantId,
                        is_active: true
                    },
                    relations: ['section']
                });
            }

            if (ticketsToRestore.length === 0) {
                throw new NotFoundException('No se encontraron tickets para restaurar');
            }

            // Restaurar cada ticket
            let restoredCount = 0;
            for (const ticket of ticketsToRestore) {
                try {
                    // Restaurar al precio original o al precio de la sección
                    const originalPrice = ticket.originalPrice || (ticket.section?.price || ticket.price);

                    await this.ticketRepository.update(ticket.id, {
                        price: originalPrice,
                        modificationType: null,
                        validFrom: null,
                        validUntil: null,
                        updated_at: new Date()
                    });

                    restoredCount++;
                } catch (error) {
                    console.log(`Error al restaurar ticket ${ticket.id}: ${error.message}`);
                }
            }

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'Ticket',
                null,
                userId,
                tenantId,
                { ticketIds, sectionId },
                { restored: restoredCount }
            );

            return createApiResponse(HttpStatus.OK, { restored: restoredCount }, `Se restauraron los precios originales de ${restoredCount} tickets`);
        } catch (error) {
            throw handleError(error, {
                context: 'TicketService.restoreOriginalPrices',
                action: 'update',
                entityName: 'Ticket',
                additionalInfo: {
                    ticketIds,
                    sectionId,
                    message: 'Error al restaurar precios originales'
                }
            });
        }
    }
}