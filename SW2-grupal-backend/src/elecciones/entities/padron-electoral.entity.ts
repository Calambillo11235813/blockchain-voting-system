import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Eleccion } from './eleccion.entity';
import { Elector } from '../../electores/entities/elector.entity';

/**
 * Entidad que representa la whitelist o padrón electoral de un comicio.
 *
 * Cada fila define que un Elector específico está (o no) habilitado para
 * participar en una Elección concreta. La combinación (eleccion, elector)
 * debe ser única: un elector no puede estar dos veces en el mismo padrón.
 *
 * Esta tabla es la que se carga masivamente mediante el RF1 (carga de padrón).
 */
@Entity('padron_electoral')
@Unique(['eleccion', 'elector'])
export class PadronElectoral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Indica si el elector está actualmente habilitado para votar en este comicio.
   * Puede ser revocado por el administrador antes del inicio de la jornada.
   */
  @Column('bool', { nullable: false, default: true })
  estaHabilitado: boolean;

  /** Fecha de registro del elector en este padrón (auditoría). */
  @CreateDateColumn({ type: 'timestamp' })
  fechaRegistro: Date;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Elección a la que pertenece este registro del padrón.
   * Si la Elección es eliminada, se elimina el registro del padrón en cascada.
   */
  @ManyToOne(() => Eleccion, { nullable: false, onDelete: 'CASCADE' })
  eleccion: Eleccion;

  /**
   * Elector habilitado en este padrón.
   * Si el Elector es eliminado del sistema, se elimina su entrada del padrón.
   */
  @ManyToOne(() => Elector, { nullable: false, onDelete: 'CASCADE' })
  elector: Elector;
}
