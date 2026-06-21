import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EleccionCargo } from './eleccion-cargo.entity';
import { TipoCargoEnum } from '../enums/tipo-cargo.enum';

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

  /**
   * Facultad descriptiva legacy del catálogo.
   * @deprecated El alcance territorial vive en EleccionCargo.
   */
  @Column('text', { nullable: true, default: '' })
  facultad: string | null;

  /** Clasificación semántica para reglas de negocio (Rector, Decano, etc.). */
  @Column({
    type: 'enum',
    enum: TipoCargoEnum,
    nullable: false,
    default: TipoCargoEnum.OTRO,
  })
  tipoCargo: TipoCargoEnum;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  /**
   * Instancias temporales en que este cargo ha sido disputado en elecciones.
   */
  @OneToMany(() => EleccionCargo, (ec) => ec.cargo)
  eleccionCargos: EleccionCargo[];
}
