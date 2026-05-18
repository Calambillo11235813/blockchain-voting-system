import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity';
import { EleccionCargo } from './eleccion-cargo.entity';

/**
 * Entidad que representa un proceso electoral (comicio) en la UAGRM.
 * Pertenece a un único Administrador y puede tener múltiples Cargos.
 */
@Entity('eleccion')
export class Eleccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre descriptivo del proceso electoral (ej. "Elecciones Facultad de Tecnología 2025"). */
  @Column('text', { nullable: false })
  titulo: string;

  /** Año de gestión académica al que pertenece la elección. */
  @Column('int', { nullable: false })
  gestion: number;

  /** Fecha programada para la jornada de votación. */
  @Column('date', { nullable: false })
  fecha: Date;

  /** Indica si la votación está restringida por orden alfabético de apellido. */
  @Column('bool', { nullable: false, default: true })
  restriccionAlfabeticaActiva: boolean;

  /** Indica si la jornada de votación está actualmente abierta. */
  @Column('bool', { nullable: false, default: false })
  estaActiva: boolean;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Administrador responsable de este proceso electoral.
   * Nullable para permitir la creación de elecciones sin requerir
   * un administrador explícito en el flujo actual del sistema.
   */
  @ManyToOne(() => Administrador, (administrador) => administrador.elecciones, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  administrador: Administrador | null;

  /**
   * Instancias de Cargo-en-esta-Elección (patrón Clase Asociación).
   * Cada EleccionCargo agrupa los frentes que compiten por un cargo específico.
   */
  @OneToMany(() => EleccionCargo, (ec) => ec.eleccion, { cascade: false })
  eleccionCargos: EleccionCargo[];
}
