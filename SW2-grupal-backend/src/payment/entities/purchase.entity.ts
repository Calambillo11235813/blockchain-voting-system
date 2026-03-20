import { User } from "src/auth/entities/user.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Payment } from './payment.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TicketPurchase } from './ticket-purchase.entity';
import { PurchaseStatus } from 'src/common/enums/purchase-status/purchase-status.enum';

@Entity()
export class Purchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('decimal', {
        precision: 10,
        scale: 2
    })
    total: number;

    @Column({
        type: 'enum',
        enum: PurchaseStatus,
        default: PurchaseStatus.PENDING
    })
    status: PurchaseStatus;

    @Column('text', { nullable: true })
    observations: string;

    @Column('timestamp', { nullable: false })
    date: Date;

    @Column('timestamp', { nullable: false, default: () => 'now()' })
    created_at: Date;

    @Column('timestamp', { nullable: false, default: () => 'now()' })
    updated_at: Date;

    // RELATIONS
    @ManyToOne(() => User, user => user.purchases)
    user: User;

    @OneToMany(() => TicketPurchase, tp => tp.purchase)
    ticketPurchases: TicketPurchase[];

    @OneToOne(() => Payment, payment => payment.purchase)
    @JoinColumn()
    payment: Payment;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
}