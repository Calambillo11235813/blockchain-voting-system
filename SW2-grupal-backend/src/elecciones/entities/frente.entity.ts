import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cargo } from './cargo.entity';
import { Candidato } from './candidato.entity';

/**
 * Entidad que representa un frente electoral dentro de un cargo.
 */
@Entity('frente')
export class Frente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  nombreFrente: string;

  @Column('text', { nullable: false })
  sigla: string;

  @Column('text', { nullable: true })
  logoUrl: string | null;

  @ManyToOne(() => Cargo, (cargo) => cargo.frentes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  cargo: Cargo;

  @OneToMany(() => Candidato, (candidato) => candidato.frente, { cascade: false })
  candidatos: Candidato[];
}
