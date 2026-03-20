import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Purchase } from './purchase.entity';
import { PaymentMethod } from 'src/common/enums/payment-method-enum/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status-enum/payment-status.enum';

@Entity()
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false
    })
    amount: string;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.CARD
    })
    method: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    })
    status: PaymentStatus;

    // Fecha específica del pago (cuando se completó la transacción)
    @Column('timestamp', { nullable: true })
    payment_date: Date;

    // ID de transacción (puede ser de Stripe u otro sistema)
    @Column({ nullable: true })
    transaction_id: string;

    // Stripe specific fields
    @Column({ nullable: true })
    stripePaymentIntentId: string;

    @Column({ nullable: true })
    stripeCustomerId: string;

    @Column('timestamp', { nullable: false, default: () => 'now()' })
    created_at: Date;

    @Column('timestamp', { nullable: false, default: () => 'now()' })
    updated_at: Date;

    // RELATIONS
    @OneToOne(() => Purchase, purchase => purchase.payment)
    purchase: Purchase;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
}