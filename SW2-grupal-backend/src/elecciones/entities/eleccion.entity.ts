import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cargo } from './cargo.entity';

/**
 * Entidad que representa una eleccion facultativa en la UAGRM.
 */
@Entity('eleccion')
export class Eleccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  titulo: string;

  @Column('int', { nullable: false })
  gestion: number;

  @Column('timestamp', { nullable: false })
  fechaInicio: Date;

  @Column('timestamp', { nullable: false })
  fechaFin: Date;

  @Column('bool', { nullable: false, default: false })
  estaActiva: boolean;

  @OneToMany(() => Cargo, (cargo) => cargo.eleccion, { cascade: false })
  cargos: Cargo[];
}
