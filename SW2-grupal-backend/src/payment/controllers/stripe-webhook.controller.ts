import { Controller, Post, Req, Headers, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { StripeService } from '../services/stripe.service';
import { Request } from 'express';
import { RawBodyRequest } from '@nestjs/common';

@Controller('webhooks')
export class StripeWebhookController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly stripeService: StripeService,
    ) { }

    @Post('stripe/tickets')
    @HttpCode(200)
    async handleTicketPaymentWebhook(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ): Promise<any> {
        try {
            if (!signature) {
                throw new HttpException('Stripe signature is missing', HttpStatus.BAD_REQUEST);
            }

            const event = this.stripeService.verifyWebhookSignature(
                request.rawBody,
                signature,
                'ticket'
            );

            // Procesar el evento
            await this.paymentService.handleStripeWebhook(event);

            return { received: true, type: 'ticket_payments' };
        } catch (error) {
            console.error('Error en webhook de pagos de tickets:', error);
            throw new HttpException(
                'Webhook Error: ' + error.message,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}