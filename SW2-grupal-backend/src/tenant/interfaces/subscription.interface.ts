import Stripe from 'stripe';
import { Tenant } from '../entities/tenant.entity';
import { MemberTenant } from '../entities/member-tenant.entity';
import { PaymentMembreship } from '../entities/payment-membreship';

export interface ListSubscription {
    total: number;
    subscriptions: Subscription[];
}

export interface SusbcriptionByID {
    subscription: Subscription;
}

export interface Subscription {
    id: string;
    plan_type: string;
    price: number;
    duration: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}


export interface PaymentSubscription {
    paymentStripe: Stripe.Response<Stripe.Checkout.Session>
}

export interface WebhookPayment {
    tenant: Tenant,
    members: MemberTenant,
    payment: PaymentMembreship
}