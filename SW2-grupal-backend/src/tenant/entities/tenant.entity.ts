import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Event } from 'src/event/entities/event.entity';
import { Faculty } from '../../event/entities/faculty.entity';
import { Section } from 'src/event/entities/section.entity';
import { Ticket } from 'src/event/entities/ticket.entity';
import { IdentityVerification } from 'src/identity/entities/identity-verification.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Purchase } from 'src/payment/entities/purchase.entity';
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';
import { PaymentMembreship } from './payment-membreship';
import { MemberTenant } from './member-tenant.entity';

@Entity()
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true,
        nullable: false
    })
    name: string;

    @Column('text', {
        nullable: false
    })
    display_name: string;

    @Column('text', {
        nullable: true
    })
    logo_url: string;

    @Column('bool', {
        default: true
    })
    is_active: boolean;

    @Column('timestamp', {
        default: () => 'now()'
    })
    created_at: Date;

    @Column('timestamp', {
        default: () => 'now()'
    })
    updated_at: Date;

    //? RELATIONS
    // @OneToMany(() => User, user => user.tenant)
    // users: User[];

    @OneToMany(() => Event, event => event.tenant)
    event: Event[];

    @OneToMany(() => Faculty, faculty => faculty.tenant)
    faculty: Faculty[];

    @OneToMany(() => Section, section => section.tenant)
    section: Section[];

    @OneToMany(() => Ticket, ticket => ticket.tenant)
    ticket: Ticket[];

    @OneToMany(() => IdentityVerification, identityVerification => identityVerification.tenant)
    identityVerification: IdentityVerification[];

    @OneToMany(() => Payment, payment => payment.tenant)
    payment: Payment[];

    @OneToMany(() => Purchase, purchase => purchase.tenant)
    purchase: Purchase[];

    @OneToMany(() => TicketPurchase, ticketPurchase => ticketPurchase.tenant)
    ticketPurchase: TicketPurchase[];

    @OneToMany(() => PaymentMembreship, record => record.tenant)
    subscriptionRecords: PaymentMembreship[];

    @OneToMany(() => MemberTenant, memberTenant => memberTenant.tenant)
    memberTenants: MemberTenant[];
    //?
}