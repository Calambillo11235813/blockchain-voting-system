import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum ActionType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    VIEW = 'view',
    LOGIN = 'login',
    LOGOUT = 'logout',
    VERIFY = 'verify',
    REJECT = 'reject',
    APPROVE = 'approve',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ActionType,
    })
    action: ActionType;

    @Column('text')
    entity: string;

    @Column('uuid', { nullable: true })
    entity_id: string;

    @Column('uuid')
    user_id: string;

    @Column('uuid', { nullable: true })
    tenant_id: string;

    @Column('jsonb', { nullable: true })
    old_values: Record<string, any>;

    @Column('jsonb', { nullable: true })
    new_values: Record<string, any>;

    @Column('text', { nullable: true })
    ip_address: string;

    @Column('text', { nullable: true })
    user_agent: string;

    @CreateDateColumn()
    @Index()
    created_at: Date;
}