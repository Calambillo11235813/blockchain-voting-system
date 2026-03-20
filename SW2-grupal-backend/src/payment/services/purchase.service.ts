import { Injectable, BadRequestException, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Purchase } from '../entities/purchase.entity';
import { TicketPurchase } from '../entities/ticket-purchase.entity';
import { Ticket } from 'src/event/entities/ticket.entity';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { AuditService } from 'src/audit/services/audit.service';
import { ActionType } from 'src/audit/entities/audit.entity';
import { handleError } from 'src/common/helpers/function-helper';
import { MemberTenantService } from 'src/tenant/services/member-tenant.service';
import { PurchaseStatus } from 'src/common/enums/purchase-status/purchase-status.enum';
import { Section } from 'src/event/entities/section.entity';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class PurchaseService {
    private readonly systemFeePercentage: number;

    constructor(
        @InjectRepository(Purchase)
        private readonly purchaseRepository: Repository<Purchase>,
        @InjectRepository(TicketPurchase)
        private readonly ticketPurchaseRepository: Repository<TicketPurchase>,
        @InjectRepository(Section)
        private readonly sectionRepository: Repository<Section>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly memberTenantService: MemberTenantService,
        private readonly auditService: AuditService,
    ) {
    }

    async findAll(userId: string, memberTenantId: string, paginationDto: PaginationDto): Promise<ApiResponse<Purchase[]>> {
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
            if (!existMembertenant)
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);

            const skip = page ? (page - 1) * limit : offset;

            const queryBuilder = this.purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.payment', 'payment')
                .leftJoinAndSelect('purchase.ticketPurchases', 'ticketPurchases')
                .leftJoinAndSelect('ticketPurchases.ticket', 'ticket')
                .leftJoinAndSelect('purchase.user', 'user')
                .leftJoinAndSelect('purchase.tenant', 'tenant')
                .innerJoin('tenant.memberTenants', 'memberTenants', 'memberTenants.id = :memberTenantId', {
                    memberTenantId: existMembertenant.data.id
                });

            if (search) {
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search OR ticket.name ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            queryBuilder
                .orderBy(`purchase.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [purchases, total] = await queryBuilder.getManyAndCount();

            await this.auditService.logAction(
                ActionType.VIEW,
                'Purchase',
                null,
                userId,
                purchases[0]?.tenantId || null,
                null,
                null
            );

            return createApiResponse(
                HttpStatus.OK,
                purchases,
                'Compras obtenidas correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.findAll',
                action: 'query',
                entityName: 'Purchase',
                additionalInfo: {
                    message: 'Error al obtener compras',
                },
            });
        }
    }

    async findOne(id: string, userId: string, memberTenantId: string): Promise<ApiResponse<Purchase>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant)
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);

            const purchase = await this.purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.payment', 'payment')
                .leftJoinAndSelect('purchase.ticketPurchases', 'ticketPurchases')
                .leftJoinAndSelect('ticketPurchases.ticket', 'ticket')
                .leftJoinAndSelect('purchase.user', 'user')
                .leftJoinAndSelect('purchase.tenant', 'tenant')
                .innerJoin('tenant.memberTenants', 'memberTenants', 'memberTenants.id = :memberTenantId', {
                    memberTenantId
                })
                .where('purchase.id = :id', { id })
                .getOne();

            if (!purchase) {
                throw new NotFoundException(`Compra con ID ${id} no encontrada`);
            }

            await this.auditService.logAction(
                ActionType.VIEW,
                'Purchase',
                id,
                userId,
                purchase.tenantId,
                null,
                null
            );

            return createApiResponse(HttpStatus.OK, purchase, 'Compra obtenida correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.findOne',
                action: 'query',
                entityName: 'Purchase',
                entityId: id,
                additionalInfo: {
                    message: 'Error al obtener compra',
                },
            });
        }
    }


    async validateClientTicket(ticketPurchaseId: string, userId: string): Promise<ApiResponse<any>> {
        try {
            // Buscar el ticket de compra que pertenezca al usuario (sin necesidad de memberTenantId)
            const ticketPurchase = await this.ticketPurchaseRepository.findOne({
                where: {
                    id: ticketPurchaseId,
                    purchase: { user: { id: userId } } // Verificar que pertenezca al usuario que lo valida
                },
                relations: ['ticket', 'purchase', 'purchase.user'],
            });

            if (!ticketPurchase) {
                throw new NotFoundException(`Ticket de compra no encontrado o no pertenece al usuario`);
            }

            // Verificar el estado del ticket
            if (!ticketPurchase.status) {
                throw new BadRequestException('Este ticket ya ha sido utilizado');
            }

            // Verificar que la compra esté pagada
            if (ticketPurchase.purchase.status !== PurchaseStatus.PAID) {
                throw new BadRequestException('Este ticket no ha sido pagado');
            }

            const oldValues = { ...ticketPurchase };

            // Validar el ticket (marcarlo como usado)
            ticketPurchase.status = false;
            ticketPurchase.validated_at = new Date();

            await this.ticketPurchaseRepository.save(ticketPurchase);

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.UPDATE,
                'TicketPurchase',
                ticketPurchase.id,
                userId,
                ticketPurchase.tenantId, // Usar el tenantId del ticket
                oldValues,
                ticketPurchase
            );

            return createApiResponse(HttpStatus.OK, {
                success: true,
                ticket: {
                    id: ticketPurchase.ticket.id,
                    section: ticketPurchase.ticket.section.name,
                    price: ticketPurchase.ticket.price
                },
                validatedAt: ticketPurchase.validated_at
            }, 'Ticket validado correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.validateClientTicket',
                action: 'update',
                entityName: 'TicketPurchase',
                entityId: ticketPurchaseId,
                additionalInfo: {
                    message: 'Error al validar ticket',
                }
            });
        }
    }


    async getMyPurchases(userId: string, memberTenantId: string, paginationDto: PaginationDto): Promise<ApiResponse<Purchase[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant)
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);

            const skip = page ? (page - 1) * limit : offset;

            const queryBuilder = this.purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.payment', 'payment')
                .leftJoinAndSelect('purchase.ticketPurchases', 'ticketPurchases')
                .leftJoinAndSelect('ticketPurchases.ticket', 'ticket')
                .leftJoinAndSelect('purchase.tenant', 'tenant')
                .where('purchase.user.id = :userId', { userId })
                .andWhere('purchase.tenantId = :tenantId', { tenantId: existMembertenant.data.tenantId });

            queryBuilder
                .orderBy(`purchase.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [purchases, total] = await queryBuilder.getManyAndCount();

            await this.auditService.logAction(
                ActionType.VIEW,
                'Purchase',
                null,
                userId,
                existMembertenant.data.tenantId,
                null,
                { action: 'my-purchases' }
            );

            return createApiResponse(
                HttpStatus.OK,
                purchases,
                'Mis compras obtenidas correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.getMyPurchases',
                action: 'query',
                entityName: 'Purchase',
                additionalInfo: {
                    userId,
                    message: 'Error al obtener mis compras',
                }
            });
        }
    }

    async getPurchaseStatistics(userId: string, memberTenantId: string): Promise<ApiResponse<any>> {
        try {
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant)
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);

            const tenantId = existMembertenant.data.tenantId;

            // Total de compras
            const totalPurchases = await this.purchaseRepository.count({
                where: { tenantId }
            });

            // Compras pagadas
            const paidPurchases = await this.purchaseRepository.count({
                where: { tenantId, status: PurchaseStatus.PAID }
            });

            // Compras pendientes
            const pendingPurchases = await this.purchaseRepository.count({
                where: { tenantId, status: PurchaseStatus.PENDING }
            });

            // Ingresos totales
            const totalRevenue = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select('SUM(purchase.total)', 'total')
                .where('purchase.tenantId = :tenantId', { tenantId })
                .andWhere('purchase.status = :status', { status: PurchaseStatus.PAID })
                .getRawOne();

            // Compras por mes (últimos 6 meses)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const purchasesByMonth = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select("TO_CHAR(purchase.date, 'YYYY-MM') as month")
                .addSelect('COUNT(purchase.id)', 'count')
                .addSelect('SUM(purchase.total)', 'revenue')
                .where('purchase.tenantId = :tenantId', { tenantId })
                .andWhere('purchase.date >= :sixMonthsAgo', { sixMonthsAgo })
                .andWhere('purchase.status = :status', { status: PurchaseStatus.PAID })
                .groupBy("TO_CHAR(purchase.date, 'YYYY-MM')")
                .orderBy("TO_CHAR(purchase.date, 'YYYY-MM')", 'ASC')
                .getRawMany();

            const statistics = {
                totalPurchases,
                paidPurchases,
                pendingPurchases,
                totalRevenue: parseFloat(totalRevenue?.total || '0'),
                purchasesByMonth
            };

            await this.auditService.logAction(
                ActionType.VIEW,
                'Purchase',
                null,
                userId,
                tenantId,
                null,
                { action: 'statistics' }
            );

            return createApiResponse(HttpStatus.OK, statistics, 'Estadísticas de compras obtenidas correctamente');
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.getPurchaseStatistics',
                action: 'query',
                entityName: 'Purchase',
                additionalInfo: {
                    memberTenantId,
                    message: 'Error al obtener estadísticas de compras',
                }
            });
        }
    }

    async create(createPurchaseDto: CreatePurchaseDto, userId: string, memberTenantId: string): Promise<ApiResponse<Purchase>> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Validar tenant
            const existMembertenant = await this.memberTenantService.findOne(memberTenantId, userId);
            if (!existMembertenant) {
                throw new NotFoundException(`Miembro inquilino con ID ${memberTenantId} no encontrado`);
            }

            const tenantId = existMembertenant.data.tenantId;

            // Verificar que hay items para comprar
            if (!createPurchaseDto.items || createPurchaseDto.items.length === 0) {
                throw new BadRequestException('Debe seleccionar al menos una sección para comprar');
            }

            // Crear la compra
            const purchase = this.purchaseRepository.create({
                tenantId,
                total: 0, // Lo actualizaremos después de procesar los tickets
                status: PurchaseStatus.PENDING,
                date: new Date(),
                observations: createPurchaseDto.observations || null,
                user: { id: userId } // Relación con el usuario que realiza la compra
            });

            const savedPurchase = await queryRunner.manager.save(purchase);

            let total = 0;
            const processedTickets = [];

            // Procesar cada sección
            for (const item of createPurchaseDto.items) {
                const { sectionId, quantity } = item;

                // Verificar que la sección existe
                const section = await this.sectionRepository.findOne({
                    where: { id: sectionId, tenantId },
                    relations: ['event']
                });

                if (!section) {
                    throw new NotFoundException(`Sección con ID ${sectionId} no encontrada`);
                }

                // Obtener tickets disponibles para esta sección
                const availableTickets = await queryRunner.manager
                    .createQueryBuilder(Ticket, 't')
                    .select('t')
                    .where('t.sectionId = :sectionId', { sectionId })
                    .andWhere('t.is_active = true')
                    .andWhere('t.tenantId = :tenantId', { tenantId })
                    .orderBy('t.id')
                    .take(quantity)
                    .setLock('pessimistic_write') // Bloqueo para prevenir concurrencia
                    .getMany();

                if (availableTickets.length < quantity) {
                    throw new BadRequestException(
                        `No hay suficientes tickets disponibles en la sección seleccionada. 
                    Solicitados: ${quantity}, Disponibles: ${availableTickets.length}`
                    );
                }

                // Procesar cada ticket disponible
                for (const ticket of availableTickets) {
                    // Calcular subtotal y comisión del sistema
                    const price = ticket.price;
                    const systemFee = parseFloat(((price * this.systemFeePercentage) / 100).toFixed(2));

                    // Actualizar total
                    total += price + systemFee;


                    // Crear relación ticket-compra
                    const ticketPurchase = this.ticketPurchaseRepository.create({
                        tenantId,
                        ticket,
                        purchase: savedPurchase,
                        price: price,
                        quantity: 1,
                        subtotal: price,
                        system_fee: systemFee,
                        status: true
                    });

                    await queryRunner.manager.save(ticketPurchase);
                    processedTickets.push(ticketPurchase);

                    // Marcar ticket como no disponible
                    ticket.is_active = false;
                    await queryRunner.manager.save(ticket);
                }
            }

            // Actualizar total en la compra
            savedPurchase.total = parseFloat(total.toFixed(2));
            await queryRunner.manager.save(savedPurchase);

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.CREATE,
                'Purchase',
                savedPurchase.id,
                userId,
                tenantId,
                null,
                savedPurchase
            );

            await queryRunner.commitTransaction();

            // Cargar la compra con relaciones
            const purchaseWithRelations = await this.purchaseRepository.findOne({
                where: { id: savedPurchase.id },
                relations: ['ticketPurchases', 'ticketPurchases.ticket', 'payment'],
            });

            return createApiResponse(HttpStatus.CREATED, purchaseWithRelations, 'Compra creada correctamente');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw handleError(error, {
                context: 'PurchaseService.create',
                action: 'create',
                entityName: 'Purchase',
                additionalInfo: {
                    dto: createPurchaseDto,
                    message: 'Error al crear compra',
                }
            });
        } finally {
            await queryRunner.release();
        }
    }


    async createForUser(createPurchaseDto: CreatePurchaseDto, userId: string): Promise<ApiResponse<any>> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Verificar que hay secciones para comprar
            if (!createPurchaseDto.items || createPurchaseDto.items.length === 0) {
                throw new BadRequestException('Debe seleccionar al menos una sección para comprar');
            }

            // Obtener el tenantId de la primera sección
            const tenantId = await this.getTenantIdFromSection(createPurchaseDto.items[0].sectionId);

            // Inicializar compra
            const purchase = this.purchaseRepository.create({
                status: PurchaseStatus.PENDING,
                user: { id: userId },
                observations: createPurchaseDto.observations || null,
                date: new Date(),
                tenantId: tenantId,
                total: 0
            });

            await queryRunner.manager.save(purchase);

            let totalAmount = 0;
            const ticketPurchases = [];

            // Procesar cada sección
            for (const item of createPurchaseDto.items) {
                const { sectionId, quantity } = item;

                // Verificar que la sección existe
                const section = await this.sectionRepository.findOne({
                    where: { id: sectionId },
                    relations: ['event']
                });

                if (!section) {
                    throw new NotFoundException(`Sección con ID ${sectionId} no encontrada`);
                }

                // Verificar que todas las secciones pertenecen al mismo tenant
                if (section.event.tenantId !== tenantId) {
                    throw new BadRequestException('Todas las secciones deben pertenecer al mismo organizador');
                }

                // Verificar disponibilidad
                const availableTickets = await queryRunner.manager
                    .createQueryBuilder(Ticket, 't')
                    .where('t.sectionId = :sectionId', { sectionId })
                    .andWhere('t.is_active = true')
                    .orderBy('t.id')
                    .take(quantity)
                    .setLock('pessimistic_write')
                    .getMany();

                if (availableTickets.length < quantity) {
                    throw new BadRequestException(
                        `No hay suficientes tickets disponibles en la sección seleccionada. 
                    Solicitados: ${quantity}, Disponibles: ${availableTickets.length}`
                    );
                }

                // Procesar cada ticket disponible
                for (const ticket of availableTickets) {
                    const price = Number(ticket.price);
                    const systemFee = Number(this.calculateSystemFee(price));

                    totalAmount = Number(totalAmount) + Number(price) + Number(systemFee);

                    // Crear registro de compra SIN QR INICIALMENTE
                    const ticketPurchase = this.ticketPurchaseRepository.create({
                        ticket: { id: ticket.id },
                        purchase: { id: purchase.id },
                        price: price,
                        quantity: 1,
                        subtotal: price,
                        system_fee: systemFee,
                        tenantId: ticket.tenantId,
                        status: true,
                    });

                    // Guardar el registro
                    await queryRunner.manager.save(ticketPurchase);
                    ticketPurchases.push(ticketPurchase);

                    // Marcar ticket como no disponible
                    ticket.is_active = false;
                    await queryRunner.manager.save(ticket);
                }
            }

            purchase.total = Number(totalAmount);
            // purchase.total = parseFloat(totalAmount.toFixed(2));
            await queryRunner.manager.save(purchase);

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.CREATE,
                'Purchase',
                purchase.id,
                userId,
                purchase.tenantId,
                null,
                purchase
            );

            await queryRunner.commitTransaction();

            return createApiResponse(HttpStatus.CREATED, {
                id: purchase.id,
                total: purchase.total,
                status: purchase.status,
                created_at: purchase.created_at,
                ticketPurchases
            }, 'Compra creada correctamente. Los códigos QR se generarán en segundo plano.');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw handleError(error, {
                context: 'PurchaseService.createForUser',
                action: 'create',
                entityName: 'Purchase',
                additionalInfo: {
                    userId,
                    date: '2025-06-15 15:33:42',
                    message: 'Error al crear la compra',
                }
            });
        } finally {
            await queryRunner.release();
        }
    }

    private async getTenantIdFromSection(sectionId: string): Promise<string> {
        const section = await this.sectionRepository.findOne({
            where: { id: sectionId },
            relations: ['event']
        });

        if (!section || !section.event) {
            throw new NotFoundException('Sección no encontrada o no tiene evento asociado');
        }

        return section.event.tenantId;
    }

    private calculateSystemFee(amount: number): number {
        amount = Number(amount);
        const feePercentage = 5;
        return Number((amount * (feePercentage / 100)));
    }

    async getMyPurchasesForUser(userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Purchase[]>> {
        try {
            const {
                limit = 10,
                offset = 0,
                order = 'DESC',
                orderBy = 'created_at',
                page = 1
            } = paginationDto;

            const skip = page ? (page - 1) * limit : offset;

            const queryBuilder = this.purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.payment', 'payment')
                .leftJoinAndSelect('purchase.ticketPurchases', 'ticketPurchases')
                .leftJoinAndSelect('ticketPurchases.ticket', 'ticket')
                .leftJoinAndSelect('ticket.section', 'section') // Añadimos la sección
                .leftJoinAndSelect('section.event', 'event') // Añadimos el evento relacionado con la sección
                .leftJoinAndSelect('purchase.tenant', 'tenant')
                .where('purchase.user.id = :userId', { userId });

            queryBuilder
                .orderBy(`purchase.${orderBy}`, order)
                .skip(skip)
                .take(limit);

            const [purchases, total] = await queryBuilder.getManyAndCount();

            // Procesamiento adicional para generar QR codes para los tickets
            const processedPurchases = await Promise.all(purchases.map(async (purchase) => {
                // Solo procesamos tickets para compras pagadas
                if (purchase.status === PurchaseStatus.PAID) {
                    const ticketPurchasesWithQr = await Promise.all(purchase.ticketPurchases.map(async (tp) => {
                        // Generar QR para cada ticket
                        const qrPayload = {
                            purchaseId: purchase.id,
                            ticketId: tp.id,
                            ticketSection: tp.ticket.section?.name || 'Sin sección',
                            quantity: tp.quantity,
                            price: tp.price,
                            hash: crypto.createHash('sha256').update(`${purchase.id}-${tp.id}-${Date.now()}`).digest('hex'),
                            timestamp: Date.now(),
                            is_used: tp.is_used || false,
                            validated_at: tp.validated_at
                        };

                        const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));

                        // Añadimos el QR al objeto ticket
                        return {
                            ...tp,
                            qrCodeUrl
                        };
                    }));

                    // Reemplazamos los ticketPurchases con los que tienen QR
                    purchase.ticketPurchases = ticketPurchasesWithQr;
                }

                return purchase;
            }));

            // Registrar auditoría (sin tenantId específico)
            await this.auditService.logAction(
                ActionType.VIEW,
                'Purchase',
                null,
                userId,
                null, // No hay tenantId específico
                null,
                { action: 'my-purchases' }
            );

            return createApiResponse(
                HttpStatus.OK,
                processedPurchases,
                'Mis compras obtenidas correctamente',
                undefined,
                { total, page: page || Math.floor(skip / limit) + 1, limit }
            );
        } catch (error) {
            throw handleError(error, {
                context: 'PurchaseService.getMyPurchasesForUser',
                action: 'query',
                entityName: 'Purchase',
                additionalInfo: {
                    userId,
                    message: 'Error al obtener mis compras',
                }
            });
        }
    }


    async findOneForUser(purchaseId: string, userId: string): Promise<ApiResponse<Purchase>> {
        try {
            const purchase = await this.purchaseRepository.findOne({
                where: { id: purchaseId, user: { id: userId } },
                relations: ['ticketPurchases', 'ticketPurchases.ticket', 'payment', 'user'],
            });

            if (!purchase) {
                return createApiResponse(
                    HttpStatus.NOT_FOUND,
                    null,
                    `Compra con ID ${purchaseId} no encontrada para este usuario`
                );
            }

            return createApiResponse(
                HttpStatus.OK,
                purchase,
                'Compra encontrada correctamente'
            );
        } catch (error) {
            throw handleError(error, {
                context: 'PaymentService.findOneForUser',
                action: 'query',
                entityName: 'Purchase',
                entityId: purchaseId,
                additionalInfo: {
                    userId,
                    message: 'Error al buscar compra',
                }
            });
        }
    }

    async generateTicketQR(
        ticketPurchaseId: string,
        userId: string
    ): Promise<ApiResponse<any>> {
        try {
            const ticketPurchase = await this.ticketPurchaseRepository.findOne({
                where: { id: ticketPurchaseId },
                relations: ['ticket', 'ticket.section', 'purchase', 'purchase.user']
            });

            if (!ticketPurchase) {
                throw new NotFoundException(`Ticket de compra no encontrado`);
            }

            if (ticketPurchase.purchase.user.id !== userId) {
                throw new BadRequestException('No tienes permiso para acceder a este ticket');
            }

            if (ticketPurchase.purchase.status !== PurchaseStatus.PAID) {
                throw new BadRequestException('Este ticket no ha sido pagado');
            }

            const qrPayload = {
                purchaseId: ticketPurchase.purchase.id,
                ticketId: ticketPurchase.id,
                ticketSection: ticketPurchase.ticket.section?.name || 'Sin sección',
                quantity: ticketPurchase.quantity,
                price: ticketPurchase.price,
                hash: crypto.createHash('sha256').update(`${ticketPurchase.purchase.id}-${ticketPurchase.id}-${Date.now()}`).digest('hex'),
                timestamp: Date.now(),
                is_used: ticketPurchase.is_used || false,
                validated_at: ticketPurchase.validated_at
            };

            const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));

            return createApiResponse(200, {
                ticketId: ticketPurchase.id,
                ticketSection: ticketPurchase.ticket.section?.name || 'Sin sección',
                status: ticketPurchase.status,
                is_used: ticketPurchase.is_used || false,
                validated_at: ticketPurchase.validated_at,
                qrCodeUrl: qrCodeUrl
            }, 'QR del ticket generado correctamente');
        } catch (error) {
            console.error('Error generating ticket QR:', error);
            throw error;
        }
    }

    // async validateTicket(
    //     qrData: string,
    //     userId: string,
    //     memberTenantId: string
    // ): Promise<ApiResponse<any>> {
    //     try {
    //         // Decodificar los datos del QR
    //         let qrPayload;
    //         try {
    //             qrPayload = JSON.parse(qrData);
    //         } catch (e) {
    //             throw new BadRequestException('QR inválido: formato incorrecto');
    //         }

    //         // Validar que el QR contenga datos necesarios
    //         if (!qrPayload.purchaseId || !qrPayload.ticketId) {
    //             throw new BadRequestException('QR inválido: datos insuficientes');
    //         }

    //         // Buscar el ticket-purchase asociado
    //         const ticketPurchase = await this.ticketPurchaseRepository.findOne({
    //             where: {
    //                 id: qrPayload.ticketId,
    //                 purchase: { id: qrPayload.purchaseId },
    //                 tenantId: memberTenantId
    //             },
    //             relations: ['ticket', 'ticket.section', 'purchase']
    //         });

    //         if (!ticketPurchase) {
    //             throw new NotFoundException('Ticket no encontrado o no pertenece a este tenant');
    //         }

    //         // Verificar que la compra esté pagada
    //         if (ticketPurchase.purchase.status !== PurchaseStatus.PAID) {
    //             throw new BadRequestException('Este ticket no ha sido pagado');
    //         }

    //         // Verificar si el ticket ya ha sido usado
    //         if (ticketPurchase.is_used) {
    //             throw new BadRequestException('Este ticket ya ha sido utilizado');
    //         }

    //         // Verificar la sección
    //         if (!ticketPurchase.ticket.section) {
    //             throw new BadRequestException('Este ticket no tiene una sección válida');
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
    //             memberTenantId,
    //             { is_used: false },
    //             { is_used: true, validated_at: ticketPurchase.validated_at }
    //         );

    //         // Registrar en blockchain (simulado)
    //         // const blockchainHash = this.simulateBlockchainRegistration(ticketPurchase, userId);

    //         return createApiResponse(200, {
    //             success: true,
    //             message: 'Ticket validado correctamente',
    //             ticketData: {
    //                 ticketId: ticketPurchase.id,
    //                 ticketName: ticketPurchase.ticket.name,
    //                 section: ticketPurchase.ticket.section.name,
    //                 validatedAt: ticketPurchase.validated_at,
    //                 blockchainHash
    //             }
    //         }, 'Ticket validado correctamente');
    //     } catch (error) {
    //         console.error('Error validating ticket:', error);
    //         throw error;
    //     }
    // }
}