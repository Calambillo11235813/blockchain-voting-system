import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Eleccion } from './eleccion.entity';
import { Cargo } from './cargo.entity';
import { Frente } from './frente.entity';
import { Candidato } from './candidato.entity';
import { AlcancePapeletaEnum } from '../enums/alcance-papeleta.enum';

/**
 * Papeleta / sub-elección dentro de un proceso electoral.
 *
 * Modela la temporalidad y el alcance territorial: un mismo Cargo (catálogo)
 * puede disputarse en múltiples procesos con distinto ámbito (GLOBAL, FACULTAD, CARRERA).
 */
@Entity('eleccion_cargo')
@Index(['eleccion', 'alcance', 'codFacultad', 'codCarrera', 'cargo'])
export class EleccionCargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Alcance territorial de esta papeleta. */
  @Column({
    type: 'enum',
    enum: AlcancePapeletaEnum,
    nullable: false,
    default: AlcancePapeletaEnum.GLOBAL,
  })
  alcance: AlcancePapeletaEnum;

  /** Cod.Fac. institucional cuando alcance es FACULTAD o CARRERA. */
  @Column('text', { nullable: true })
  codFacultad: string | null;

  /** Nombre descriptivo de la facultad (snapshot para UI/reportes). */
  @Column('text', { nullable: true })
  facultadNombre: string | null;

  /** CARR-PL cuando alcance es CARRERA. */
  @Column('text', { nullable: true })
  codCarrera: string | null;

  /** Nombre descriptivo de la carrera (snapshot para UI/reportes). */
  @Column('text', { nullable: true })
  carreraNombre: string | null;

  /** Orden de presentación en la papeleta digital. */
  @Column('int', { nullable: false, default: 0 })
  orden: number;

  /** Permite ocultar papeletas incompletas antes de la jornada. */
  @Column('bool', { nullable: false, default: true })
  estaActiva: boolean;

  // ─── Relaciones ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Eleccion, (eleccion) => eleccion.eleccionCargos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  eleccion: Eleccion;

  @ManyToOne(() => Cargo, (cargo) => cargo.eleccionCargos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  cargo: Cargo;

  /**
   * @deprecated Legacy — frentes ya no pertenecen a la papeleta sino a la elección.
   * Relación inversa para datos migrados con eleccionCargoId en frente.
   */
  @OneToMany(() => Frente, (frente) => frente.eleccionCargo, {
    cascade: false,
  })
  frentesLegacy: Frente[];

  /** Candidatos que postulan a esta papeleta concreta. */
  @OneToMany(() => Candidato, (candidato) => candidato.eleccionCargo, {
    cascade: false,
  })
  candidatos: Candidato[];
}
