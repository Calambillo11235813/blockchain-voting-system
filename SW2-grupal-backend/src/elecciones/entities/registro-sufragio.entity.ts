import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Eleccion } from './eleccion.entity';
import { EleccionCargo } from './eleccion-cargo.entity';
import { Elector } from '../../electores/entities/elector.entity';

/**
 * Entidad de auditoría criptográfica que registra que un Elector emitió su
 * voto en una papeleta (EleccionCargo) de un proceso electoral.
 *
 * Un elector puede emitir un sufragio por cada papeleta aplicable dentro
 * del mismo proceso, pero solo una vez por papeleta.
 */
@Entity('registro_sufragio')
@Unique(['eleccionCargo', 'elector'])
export class RegistroSufragio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp' })
  fechaSufragio: Date;

  @Index({ unique: true })
  @Column('text', { nullable: false, unique: true })
  hashTransaccion: string;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /** Proceso electoral padre (consultas agregadas). */
  @ManyToOne(() => Eleccion, { nullable: false, onDelete: 'CASCADE' })
  eleccion: Eleccion;

  /** Papeleta/sub-elección concreta en la que se emitió el sufragio. */
  @ManyToOne(() => EleccionCargo, { nullable: false, onDelete: 'CASCADE' })
  eleccionCargo: EleccionCargo;

  @ManyToOne(() => Elector, { nullable: false, onDelete: 'CASCADE' })
  elector: Elector;
}
