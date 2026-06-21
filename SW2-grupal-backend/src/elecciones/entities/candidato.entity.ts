import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Frente } from './frente.entity';
import { EleccionCargo } from './eleccion-cargo.entity';

/**
 * Candidato que postula a una papeleta concreta (EleccionCargo)
 * representando a un frente del proceso electoral.
 */
@Entity('candidato')
@Index(['eleccionCargo', 'ci'], { unique: true })
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

  /**
   * Rol concreto dentro de la fórmula de la papeleta
   * (ej. "Rector", "Decano", "Director de Carrera").
   */
  @Column('text', { nullable: true })
  rolEspecifico: string | null;

  /** Frente / coalición al que pertenece el candidato. */
  @ManyToOne(() => Frente, (frente) => frente.candidatos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  frente: Frente;

  /** Papeleta concreta a la que postula este candidato. */
  @ManyToOne(() => EleccionCargo, (ec) => ec.candidatos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  eleccionCargo: EleccionCargo;
}
