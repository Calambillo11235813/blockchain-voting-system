import {
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Eleccion } from './eleccion.entity';
import { Cargo } from './cargo.entity';
import { Frente } from './frente.entity';

/**
 * Clase Asociación que vincula un Cargo a una Elección específica.
 *
 * Modela la temporalidad: un mismo Cargo (catálogo maestro) puede estar
 * disputado en múltiples elecciones en distintas gestiones.
 * Cada instancia de EleccionCargo agrupa los Frentes que participan
 * para ese cargo en esa elección concreta.
 */
@Entity('eleccion_cargo')
export class EleccionCargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Elección a la que pertenece este registro.
   * Si la Elección es eliminada, se eliminan también sus EleccionCargo.
   */
  @ManyToOne(() => Eleccion, (eleccion) => eleccion.eleccionCargos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  eleccion: Eleccion;

  /**
   * Cargo del catálogo maestro que se disputa en esta elección.
   * Si el Cargo es eliminado del catálogo, se elimina su instancia temporal.
   */
  @ManyToOne(() => Cargo, (cargo) => cargo.eleccionCargos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  cargo: Cargo;

  /**
   * Frentes políticos que compiten por este cargo en esta elección.
   */
  @OneToMany(() => Frente, (frente) => frente.eleccionCargo, {
    cascade: false,
  })
  frentes: Frente[];
}
