import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { Purchase } from '../entities/purchase.entity';
import { StripeService } from './stripe.service';
import { AuditService } from '../../audit/services/audit.service';
import { HttpStatus } from '@nestjs/common';
import { PurchaseStatus } from '../../common/enums/purchase-status/purchase-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status-enum/payment-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method-enum/payment-method.enum';
import { User } from '../../auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { ActionType } from 'src/audit/entities/audit.entity';

@Injectable()
export class PaymentService {
    constructor(
        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,
        @InjectRepository(Purchase)
        private purchaseRepository: Repository<Purchase>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private stripeService: StripeService,
        private auditService: AuditService,
        private configService: ConfigService,
    ) { }

    async createPaymentForPurchase(
        purchaseId: string,
        userId: string,
        forceNew: boolean = false
    ): Promise<ApiResponse<Payment>> {
        try {
            // Buscar la compra con sus tickets
            const purchase = await this.purchaseRepository.findOne({
                where: { id: purchaseId },
                relations: ['ticketPurchases', 'user']
            });

            if (!purchase) {
                throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada`);
            }

            if (purchase.status !== PurchaseStatus.PENDING) {
                throw new BadRequestException(`Esta compra ya ha sido pagada o cancelada`);
            }

            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            // Verificar que el usuario sea el dueño de la compra
            if (purchase.user.id !== user.id) {
                throw new ForbiddenException(`No tienes permiso para pagar esta compra`);
            }

            // Verificar si ya existe un pago pendiente para esta compra
            const existingPayment = await this.paymentRepository.findOne({
                where: {
                    purchase: { id: purchaseId },
                    status: PaymentStatus.PENDING
                }
            });

            // Si existe un pago pendiente y no se fuerza uno nuevo, validar si todavía es utilizable
            if (existingPayment && !forceNew) {
                try {
                    // Verificar si la sesión de Stripe sigue siendo válida
                    const session = await this.stripeService.getCheckoutSession(existingPayment.transaction_id);

                    // Si la sesión no ha expirado y sigue siendo válida, retornar el pago existente
                    if (session && session.status === 'open') {
                        return createApiResponse(HttpStatus.OK, {
                            ...existingPayment,
                            checkoutUrl: session.url
                        }, 'Link de pago existente recuperado');
                    }

                    // Si llegamos aquí, la sesión no es válida, por lo que seguiremos adelante y crearemos una nueva
                } catch (error) {
                    console.log('La sesión anterior no es válida, creando una nueva:', error.message);
                    // Si hay error al verificar la sesión, la consideramos inválida y creamos una nueva
                }
            }

            // Si existe un pago pendiente y estamos forzando uno nuevo o el anterior es inválido,
            // marcar el pago anterior como cancelado
            if (existingPayment) {
                existingPayment.status = PaymentStatus.CANCELLED;
                existingPayment.updated_at = new Date();
                await this.paymentRepository.save(existingPayment);

                // Registrar la acción de cancelación en la auditoría
                await this.auditService.logAction(
                    ActionType.UPDATE,
                    'Payment',
                    existingPayment.id,
                    userId,
                    purchase.tenantId,
                    { status: PaymentStatus.PENDING },
                    { status: PaymentStatus.CANCELLED }
                );
            }

            // Crear un nuevo checkout session en Stripe
            const frontendUrl = this.configService.get<string>('frontend_url');
            const { id: sessionId, url: checkoutUrl } = await this.stripeService.createCheckoutSession({
                amount: parseFloat(purchase.total.toString()),
                currency: 'usd',
                customerEmail: user.email,
                successUrl: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${frontendUrl}/payment/cancel?purchase_id=${purchase.id}`,
                metadata: {
                    purchaseId: purchase.id,
                    userId: user.id
                },
                description: `Compra #${purchase.id.substring(0, 8)}`
            });

            // Crear nuevo registro de pago
            const payment = this.paymentRepository.create({
                purchase: { id: purchase.id },
                amount: purchase.total.toString(),
                method: PaymentMethod.CARD,
                status: PaymentStatus.PENDING,
                transaction_id: sessionId,
                tenantId: purchase.tenantId,
            });

            const savedPayment = await this.paymentRepository.save(payment);

            // Registrar auditoría
            await this.auditService.logAction(
                ActionType.CREATE,
                'Payment',
                savedPayment.id,
                user.id,
                purchase.tenantId,
                null,
                savedPayment
            );

            // Devolver el payment con la URL de checkout
            return createApiResponse(HttpStatus.CREATED, {
                ...savedPayment,
                checkoutUrl
            }, forceNew ? 'Nuevo link de pago creado exitosamente' : 'Link de pago creado exitosamente');
        } catch (error) {
            console.error('Error creating payment:', error);
            throw new BadRequestException(`Error al crear el pago: ${error.message}`);
        }
    }

    // Este método puede ser llamado explícitamente para generar un nuevo link de pago
    async createNewPaymentLink(purchaseId: string, userId: string): Promise<ApiResponse<Payment>> {
        return this.createPaymentForPurchase(purchaseId, userId, true);
    }

    // Este método sería llamado por el webhook de Stripe
    async handleStripeWebhook(event: any): Promise<void> {
        console.log(`Procesando evento de Stripe: ${event.type}`);
        const { type, data } = event;

        try {
            switch (type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(data.object);
                    break;
                case 'payment_intent.succeeded':
                    await this.handlePaymentIntentSucceeded(data.object);
                    break;
                case 'checkout.session.expired':
                    await this.handleCheckoutSessionExpired(data.object);
                    break;
                default:
                    console.log(`Evento no manejado: ${type}`);
            }
        } catch (error) {
            console.error(`Error procesando webhook ${type}:`, error);
        }
    }

    private async handleCheckoutSessionCompleted(session: any): Promise<void> {
        console.log('Procesando checkout.session.completed:', session.id);

        // Buscar el pago por el transaction_id (que contiene el session ID)
        const payment = await this.paymentRepository.findOne({
            where: { transaction_id: session.id },
            relations: ['purchase']
        });

        if (!payment) {
            console.log(`No se encontró pago para la sesión ${session.id}`);
            return;
        }

        // Obtener el payment_intent de la sesión
        const sessionDetails = await this.stripeService.getCheckoutSession(session.id);
        const paymentIntentId = sessionDetails.payment_intent as string;

        // Actualizar estado del pago
        payment.status = PaymentStatus.COMPLETED;
        payment.payment_date = new Date();
        payment.stripePaymentIntentId = paymentIntentId;

        if (session.customer) {
            payment.stripeCustomerId = session.customer;
        }

        await this.paymentRepository.save(payment);

        // Actualizar estado de la compra
        const purchase = payment.purchase;
        purchase.status = PurchaseStatus.PAID;
        await this.purchaseRepository.save(purchase);

        console.log(`Pago ${payment.id} completado exitosamente para la compra ${purchase.id}`);
    }

    private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
        console.log('Procesando payment_intent.succeeded:', paymentIntent.id);

        // Buscar el pago por el stripePaymentIntentId
        const payment = await this.paymentRepository.findOne({
            where: { stripePaymentIntentId: paymentIntent.id },
            relations: ['purchase']
        });

        if (!payment) {
            console.log(`No se encontró pago para el paymentIntent ${paymentIntent.id}`);
            return;
        }

        // Solo actualizar si aún está pendiente
        if (payment.status === PaymentStatus.PENDING) {
            payment.status = PaymentStatus.COMPLETED;
            payment.payment_date = new Date();
            await this.paymentRepository.save(payment);

            // Actualizar estado de la compra
            const purchase = payment.purchase;
            purchase.status = PurchaseStatus.PAID;
            await this.purchaseRepository.save(purchase);

            console.log(`Pago ${payment.id} completado via PaymentIntent para la compra ${purchase.id}`);
        }
    }

    private async handleCheckoutSessionExpired(session: any): Promise<void> {
        console.log('Procesando checkout.session.expired:', session.id);

        const payment = await this.paymentRepository.findOne({
            where: { transaction_id: session.id },
            relations: ['purchase']
        });

        if (!payment) return;

        // Solo actualizar si aún está pendiente
        if (payment.status === PaymentStatus.PENDING) {
            // Actualizar estado del pago (asumiendo que has añadido EXPIRED a tu enum)
            payment.status = PaymentStatus.FAILED; // Usar FAILED si no tienes EXPIRED
            await this.paymentRepository.save(payment);

            console.log(`Pago ${payment.id} expirado para la compra ${payment.purchase.id}`);
        }
    }

    // Método para verificar el estado de un pago
    async verifyPayment(paymentId: string): Promise<ApiResponse<Payment>> {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
            relations: ['purchase']
        });

        if (!payment) {
            throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
        }

        // Si el pago está pendiente y tiene un ID de sesión, verificar en Stripe
        if (payment.status === PaymentStatus.PENDING && payment.transaction_id) {
            try {
                const session = await this.stripeService.getCheckoutSession(payment.transaction_id);

                if (session.payment_status === 'paid') {
                    // Actualizar estado del pago
                    payment.status = PaymentStatus.COMPLETED;
                    payment.payment_date = new Date();
                    payment.stripePaymentIntentId = session.payment_intent as string;

                    await this.paymentRepository.save(payment);

                    // Actualizar estado de la compra
                    const purchase = payment.purchase;
                    purchase.status = PurchaseStatus.PAID;
                    await this.purchaseRepository.save(purchase);
                }
            } catch (error) {
                console.error(`Error verificando pago en Stripe:`, error);
            }
        }

        return createApiResponse(HttpStatus.OK, payment, 'Estado del pago verificado');
    }
}