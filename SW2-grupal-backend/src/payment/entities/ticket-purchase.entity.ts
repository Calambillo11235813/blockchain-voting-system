import { Ticket } from "src/event/entities/ticket.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Purchase } from "../../payment/entities/purchase.entity";
import { Tenant } from 'src/tenant/entities/tenant.entity';

@Entity()
export class TicketPurchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('int', {
        nullable: false,
    })
    quantity: number;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false,
    })
    price: number;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false,
    })
    subtotal: number;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false,
    })
    system_fee: number;

    @Column('timestamp', {
        nullable: true //?modificar
    })
    validated_at: Date;

    @Column({ default: false })
    is_used: boolean;

    @Column('bool', {
        default: true,
        nullable: false,
    })
    status: boolean;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()'
    })
    created_at: Date;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()'
    })
    updated_at: Date;

    //?RELATIONS
    @ManyToOne(() => Ticket, ticket => ticket.ticketPurchases)
    ticket: Ticket;

    @ManyToOne(() => Purchase, purchase => purchase.ticketPurchases)
    purchase: Purchase;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
    //?

}