import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EleccionCargo } from './eleccion-cargo.entity';

/**
 * Catálogo maestro de cargos universitarios disponibles para ser disputados
 * en elecciones (ej. Rector, Decano, Representante Estudiantil).
 *
 * Al desacoplarse de una Elección concreta, el mismo Cargo puede reutilizarse
 * en múltiples gestiones a través de la clase asociación EleccionCargo.
 */
@Entity('cargo')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre del cargo universitario (ej. "Rector", "Decano de Tecnología"). */
  @Column('text', { nullable: false })
  nombre: string;

  /** Facultad o unidad académica a la que pertenece este cargo. */
  @Column('text', { nullable: false })
  facultad: string;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Instancias temporales en que este cargo ha sido disputado en elecciones.
   */
  @OneToMany(() => EleccionCargo, (ec) => ec.cargo)
  eleccionCargos: EleccionCargo[];
}
