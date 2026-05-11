import { BeforeInsert, Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "./role.entity";


@Entity()
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true,
        nullable: false,
    })
    name: string;

    @Column('text', {
        nullable: true,
    })
    description: string;

    @Column('bool', {
        nullable: false,
        default: true,
    })
    state: boolean;

    @Column('text', {
        nullable: false,
    })
    slug: string;

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

    //? TRIGGERS
    @BeforeInsert()
    toUpperCase() {
        if (this.name) {
            this.name = this.name.toUpperCase().trim();
        }
    }

    @BeforeInsert()
    transformToSlug() {
        this.slug = this.name.toLowerCase().trim().replace(' ', '_');
    }
    // ?

    //? RELATIONS
    @ManyToMany(() => Role, role => role.permissions)
    roles: Role[];

    // ?

}
