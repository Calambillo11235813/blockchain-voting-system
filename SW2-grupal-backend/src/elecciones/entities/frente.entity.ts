import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Eleccion } from './eleccion.entity';
import { EleccionCargo } from './eleccion-cargo.entity';
import { Candidato } from './candidato.entity';

/**
 * Coalición / frente político que participa en un proceso electoral (Eleccion).
 *
 * Un mismo frente puede postular candidatos en distintas papeletas (EleccionCargo)
 * del mismo proceso a través de los registros de Candidato.
 */
@Entity('frente')
@Index(['eleccion', 'sigla'])
export class Frente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre completo del frente político. */
  @Column('text', { nullable: false })
  nombreFrente: string;

  /** Sigla o acrónimo del frente (ej. "MAS", "FUL"). */
  @Column('text', { nullable: false })
  sigla: string;

  /** URL de la imagen del logotipo del frente (puede ser nulo). */
  @Column('text', { nullable: true })
  logoUrl: string | null;

  /**
   * @deprecated Legacy — usar alcance de EleccionCargo en lugar de este flag.
   * Se mantiene por compatibilidad con datos existentes.
   */
  @Column('bool', { nullable: false, default: false })
  esOpcionGlobal: boolean;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /** Proceso electoral al que pertenece este frente. */
  @ManyToOne(() => Eleccion, (eleccion) => eleccion.frentes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  eleccion: Eleccion;

  /**
   * @deprecated Legacy — el frente ya no se vincula a una papeleta concreta.
   * Nullable durante la transición; nuevos frentes deben dejarlo en null.
   */
  @ManyToOne(() => EleccionCargo, (ec) => ec.frentesLegacy, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  eleccionCargo: EleccionCargo | null;

  /** Candidatos que integran este frente (cada uno en una papeleta concreta). */
  @OneToMany(() => Candidato, (candidato) => candidato.frente, {
    cascade: false,
  })
  candidatos: Candidato[];
}
