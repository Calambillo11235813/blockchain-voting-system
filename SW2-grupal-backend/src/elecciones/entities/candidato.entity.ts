import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Frente } from './frente.entity';

/**
 * Entidad que representa un candidato perteneciente a un frente.
 */
@Entity('candidato')
export class Candidato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  ci: string;

  @Column('text', { nullable: false })
  nombres: string;

  @Column('text', { nullable: false })
  apellidos: string;

  @Column('text', { nullable: true })
  fotoUrl: string | null;

  @ManyToOne(() => Frente, (frente) => frente.candidatos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  frente: Frente;
}
