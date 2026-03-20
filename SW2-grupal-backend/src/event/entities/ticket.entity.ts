import { PriceModificationType } from 'src/common/enums/price-modification-type-enum/price-modification-type.enum';
import { Section } from "src/event/entities/section.entity";
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Ticket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('timestamp', {
        nullable: false,
    })
    date: Date;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false,
    })
    price: number;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: true,
        name: 'original_price'
    })
    originalPrice: number;

    @Column({
        type: 'enum',
        enum: PriceModificationType,
        nullable: true
    })
    modificationType: PriceModificationType;

    @Column('timestamp', {
        nullable: true,
        name: 'valid_from'
    })
    validFrom: Date;

    @Column('timestamp', {
        nullable: true,
        name: 'valid_until'
    })
    validUntil: Date;

    @Column('bool', {
        default: true,
        nullable: false,
    })
    is_active: boolean;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()',
    })
    created_at: Date;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()',
    })
    updated_at: Date;

    //?RELATIONS
    @ManyToOne(() => Section, section => section.tickets)
    section: Section;

    @OneToMany(() => TicketPurchase, ticketPurchase => ticketPurchase.ticket)
    ticketPurchases: TicketPurchase[];

    @ManyToOne(() => Tenant, tenant => tenant.ticket)
    @JoinColumn()
    tenant: Tenant;
}