import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "src/auth/entities/user.entity";
import { Role } from "src/auth/entities/role.entity";

@Entity()
export class MemberTenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    tenantId: string;

    @Column('text', {
        nullable: true
    })
    password_tenant: string;

    @Column('text', {
        nullable: true
    })
    ticket_validator_address: string;

    @Column('timestamp', {
        nullable: false,
        default: () => 'now()',
    })
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    //?RELATIONS
    @ManyToOne(() => Tenant)
    tenant: Tenant;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => Role)
    role: Role;
    //?
}