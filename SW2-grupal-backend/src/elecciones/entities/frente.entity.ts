import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EleccionCargo } from './eleccion-cargo.entity';
import { Candidato } from './candidato.entity';

/**
 * Entidad que representa un frente político que participa en un cargo
 * específico de una elección concreta (EleccionCargo).
 *
 * La columna esOpcionGlobal permite marcar frentes que aplican a todos
 * los cargos de una elección (ej. listas únicas o frentes transversales).
 */
@Entity('frente')
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
   * Indica si este frente aplica de forma global a todos los cargos
   * de la elección, en lugar de a un cargo específico.
   */
  @Column('bool', { nullable: false, default: false })
  esOpcionGlobal: boolean;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Cargo-en-Elección al que este frente se presenta.
   * Si se elimina el EleccionCargo padre, el frente se elimina en cascada.
   */
  @ManyToOne(() => EleccionCargo, (ec) => ec.frentes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  eleccionCargo: EleccionCargo;

  /** Candidatos que integran este frente para el cargo en disputa. */
  @OneToMany(() => Candidato, (candidato) => candidato.frente, {
    cascade: false,
  })
  candidatos: Candidato[];
}
