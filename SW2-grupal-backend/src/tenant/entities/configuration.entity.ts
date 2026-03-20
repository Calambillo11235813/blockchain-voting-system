import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PaymentMembreship } from './payment-membreship';

@Entity()
export class Configuration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        nullable: false
    })
    plan: string;

    @Column('int', {
        nullable: false
    })
    limit_tickets: number;

    @Column('bool', {
        default: true,
        nullable: false
    })
    blockchain: boolean;

    @Column('bool', {
        default: true,
        nullable: false
    })
    facial_recognition: boolean;

    @Column('bool', {
        default: false,
        nullable: false
    })
    document_recognition: boolean;

    @Column('bool', {
        default: false,
        nullable: false
    })
    firewall: boolean;

    //?RELATIONS
    @OneToMany(() => PaymentMembreship, record => record.configuration)
    subscriptionRecords: PaymentMembreship[];
    //?
}