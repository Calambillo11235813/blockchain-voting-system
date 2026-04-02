import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Administrador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('text', { nullable: false })
  correo: string;

  @Column('text', { nullable: false })
  password: string;
}
