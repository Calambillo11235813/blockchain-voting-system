import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Estudiante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('text', { nullable: false })
  registro: string;

  @Column('text', { nullable: false })
  nombres: string;

  @Column('text', { nullable: false })
  apellidos: string;

  @Index({ unique: true })
  @Column('text', { nullable: false })
  ci: string;

  @Index({ unique: true })
  @Column('text', { nullable: false })
  correo: string;

  @Column('text', { nullable: false })
  carrera: string;

  @Column('boolean', { nullable: false, default: true })
  estaHabilitado: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
