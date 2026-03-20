import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PaymentMembreship } from './payment-membreship';
import { SubscriptionPlanTypeEnum } from '../../common/enums/suscription-plan-type-enum/suscription-plan-type.enum';

@Entity()
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: SubscriptionPlanTypeEnum,
        default: SubscriptionPlanTypeEnum.BASIC
    })
    plan_type: SubscriptionPlanTypeEnum;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        nullable: false,
    })
    price: number;

    @Column('int', {
        nullable: true,
    })
    duration: number;

    // @Column('timestamp', {
    //     nullable: false,
    //     default: () => 'now()',
    // })
    // start_date: Date;

    // @Column('timestamp', {
    //     nullable: false,
    //     default: () => 'now()',
    // })
    // end_date: Date;

    @Column('bool', {
        default: true,
        nullable: false,
    })
    is_active: boolean;

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
    @OneToMany(() => PaymentMembreship, record => record.subscription)
    tenantRecords: PaymentMembreship[];
    //?
}