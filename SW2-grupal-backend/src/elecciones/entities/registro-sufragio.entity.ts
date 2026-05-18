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
import { Elector } from '../../electores/entities/elector.entity';

/**
 * Entidad de auditoría criptográfica que registra que un Elector emitió su
 * voto en una Elección determinada.
 *
 * PRINCIPIO DE DISEÑO — SECRETO DEL SUFRAGIO:
 * Esta entidad NO contiene referencia alguna a Frente, Candidato ni
 * EleccionCargo. Solo acredita el HECHO de haber votado y el hash de la
 * transacción blockchain que lo prueba de forma inmutable.
 * El contenido del voto vive exclusivamente en la cadena de bloques.
 *
 * RESTRICCIÓN DE DOBLE VOTO:
 * La combinación (eleccion, elector) es unique: el sistema garantiza a nivel
 * de base de datos que un elector no puede tener dos registros de sufragio
 * para la misma elección.
 */
@Entity('registro_sufragio')
@Unique(['eleccion', 'elector'])
export class RegistroSufragio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Momento exacto en que el voto fue emitido y confirmado por la blockchain.
   * Se asigna automáticamente en la inserción; es inmutable por diseño.
   */
  @CreateDateColumn({ type: 'timestamp' })
  fechaSufragio: Date;

  /**
   * Hash de transacción (TXID) devuelto por la red blockchain al registrar el voto.
   * Es único en toda la tabla: dos votos nunca pueden compartir el mismo TXID.
   * Su inmutabilidad garantiza la trazabilidad del sufragio sin revelar su contenido.
   */
  @Index({ unique: true })
  @Column('text', { nullable: false, unique: true })
  hashTransaccion: string;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Elección en la que se emitió el sufragio.
   * Si la Elección es eliminada, el registro de auditoría también se elimina.
   */
  @ManyToOne(() => Eleccion, { nullable: false, onDelete: 'CASCADE' })
  eleccion: Eleccion;

  /**
   * Elector que emitió el sufragio.
   * Permite verificar si un elector ya votó (RF6), sin revelar por quién votó.
   */
  @ManyToOne(() => Elector, { nullable: false, onDelete: 'CASCADE' })
  elector: Elector;
}
