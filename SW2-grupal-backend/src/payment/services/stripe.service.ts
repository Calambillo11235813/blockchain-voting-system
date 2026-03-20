import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
    private readonly stripe: Stripe;

    constructor(private configService: ConfigService) {
        this.stripe = new Stripe(this.configService.get<string>('stripe_key'));
    }

    async createCheckoutSession(params: {
        amount: number;
        currency: string;
        customerEmail?: string;
        successUrl: string;
        cancelUrl: string;
        metadata?: Record<string, string>;
        description?: string;
    }): Promise<{ id: string; url: string }> {
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: params.currency,
                            product_data: {
                                name: params.description || 'Compra de Tickets',
                            },
                            unit_amount: Math.round(params.amount * 100), // Convertir a centavos
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                customer_email: params.customerEmail,
                metadata: params.metadata,
            });

            return {
                id: session.id,
                url: session.url
            };
        } catch (error) {
            console.error('Error creating Stripe checkout session:', error);
            throw new Error(`Error creating payment: ${error.message}`);
        }
    }

    verifyWebhookSignature(payload: Buffer, signature: string, webhookType: 'tenant' | 'ticket' = 'ticket'): Stripe.Event {
        const secret = webhookType === 'tenant'
            ? this.configService.get<string>('stripe_tenant_webhook_secret')
            : this.configService.get<string>('stripe_ticket_webhook_secret');

        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            secret
        );
    }

    async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        return this.stripe.paymentIntents.retrieve(paymentIntentId);
    }

    async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });
    }
}