import { User } from "src/auth/entities/user.entity";
import { Event } from "src/event/entities/event.entity";
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class IdentityVerification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column('uuid')
    tenantId: string;

    @Column('text', {
        nullable: false,
    })
    document_url: string;

    @Column('text', {
        nullable: false,
    })
    selfie_url: string;

    @Column('bool', {
        default: true,
        nullable: false,
    })
    status: boolean;

    @Column('timestamp', {
        nullable: true
    })
    verified_at: Date;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()'
    })
    created_at: Date;

    //?RELATIONS
    @ManyToOne(() => User, user => user.identityVerifications)
    user: User;

    @ManyToOne(() => Event, event => event.identityVerifications)
    event: Event;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
    //?
}