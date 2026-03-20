import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./event.entity";
import { Tenant } from 'src/tenant/entities/tenant.entity';

@Entity()
export class Faculty {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('text', {
        nullable: false,
        // unique: true,
    })
    name: string;

    @Column('text', {
        nullable: true,
    })
    location: string;

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

    //? RELATIONS
    @OneToMany(() => Event, event => event.faculty)
    event: Event[];

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
    //? 
}
