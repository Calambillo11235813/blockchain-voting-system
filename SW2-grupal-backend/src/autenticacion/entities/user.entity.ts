import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "./role.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true,
        nullable: false,
    })
    email: string;

    @Column('text', {
        nullable: false,
    })
    password: string;

    @Column('text', {
        nullable: false,
    })
    fullname: string;

    @Column('text', {
        nullable: false,
    })
    lastname: string;

    @Column('text', {
        nullable: true,
    })
    phone: string;

    @Column('int', {
        nullable: true,
    })
    codeCountry: number;

    @Column('text', {
        nullable: true,
    })
    country: string;

    @Column('text', {
        nullable: true,
    })
    city: string;

    @Column({ type: 'enum', enum: ['m', 'f', 'u'], nullable: false })
    /**
     * m - male
     * f - female
     * u - unspecified
     */
    gender: string;

    @Column('text', {
        nullable: true,
    })
    photoUrl: string;

    @Column('bool', {
        default: true,
        nullable: false,
    })
    state: boolean;

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

    @Column('bool', {
        nullable: true,
        default: false,
    })
    is_policy_accepted: boolean;

    //?RELATIONS
    @ManyToOne(() => Role, {
        nullable: true
    })
    @JoinColumn({ name: 'roleId' })
    role: Role;
    //?

}
