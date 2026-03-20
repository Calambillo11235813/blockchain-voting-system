import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Faculty } from "./faculty.entity";
import { Section } from "./section.entity";
import { IdentityVerification } from "src/identity/entities/identity-verification.entity";
import { Tenant } from 'src/tenant/entities/tenant.entity';

@Entity()
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('text', {
        nullable: false,
    })
    title: string;

    @Column('text', {
        nullable: true,
    })
    description: string;

    @Column('text', {
        nullable: false,
    })
    image_event: string;

    @Column('text', {
        nullable: true,
    })
    image_section: string;

    @Column('timestamp', {
        nullable: false,
    })
    start_date: Date;

    @Column('timestamp', {
        nullable: false,
    })
    end_date: Date;

    @Column('text', {
        nullable: false,
    })
    address: string;

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
    @ManyToOne(() => Faculty, faculty => faculty.event)
    faculty: Faculty;

    @OneToMany(() => Section, section => section.event)
    sections: Section[];

    @OneToMany(() => IdentityVerification, iv => iv.event)
    identityVerifications: IdentityVerification[];

    @ManyToOne(() => Tenant, tenant => tenant.event)
    @JoinColumn()
    tenant: Tenant;
    //?
}
