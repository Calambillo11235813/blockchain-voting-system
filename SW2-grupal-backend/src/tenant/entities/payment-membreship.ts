import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Subscription } from './subscription.entity';
import { Configuration } from 'src/tenant/entities/configuration.entity';

@Entity()
export class PaymentMembreship {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Index()
    @Column('uuid')
    subscriptionId: string;

    @Index()
    @Column('uuid')
    configurationId: string;

    @Column('boolean', {
        default: true,
        nullable: false
    })
    is_active: boolean;

    @Column('timestamp', {
        nullable: false,
    })
    record_start_date: Date;

    @Column('timestamp', {
        nullable: true,
    })
    record_end_date: Date;

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
    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => Subscription)
    @JoinColumn({ name: 'subscriptionId' })
    subscription: Subscription;

    @ManyToOne(() => Configuration)
    @JoinColumn({ name: 'configurationId' })
    configuration: Configuration;
    //?
}