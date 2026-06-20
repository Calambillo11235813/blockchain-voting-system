import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Enum que representa el tipo de estamento al que pertenece un elector
 * dentro de la comunidad universitaria.
 */
export enum EstamentoEnum {
  ESTUDIANTE = 'ESTUDIANTE',
  DOCENTE = 'DOCENTE',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
}

/**
 * Entidad que representa a un miembro del padrón electoral universitario.
 * Un Elector puede ser un estudiante, un docente o personal administrativo habilitado para votar
 * en una elección específica.
 */
@Entity('electores')
export class Elector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Cédula de identidad — identificador único nacional del elector. */
  @Index({ unique: true })
  @Column('text', { nullable: false, unique: true })
  ci: string;

  /** Número de registro universitario — identificador único institucional. */
  @Index({ unique: true })
  @Column('text', { nullable: false, unique: true })
  registro: string;

  /**
   * Cod.Docente cuando la persona también tiene registro estudiantil.
   * Permite login con cualquiera de los dos códigos.
   */
  @Index({ unique: true })
  @Column('text', { nullable: true, unique: true })
  registroDocente: string | null;

  /** Nombre(s) del elector. */
  @Column('text', { nullable: false })
  nombre: string;

  /** Apellido(s) del elector. */
  @Column('text', { nullable: false })
  apellido: string;

  /** Estamento universitario al que pertenece: ESTUDIANTE o DOCENTE. */
  @Column({
    type: 'enum',
    enum: EstamentoEnum,
    nullable: false,
  })
  estamento: EstamentoEnum;

  /** Carrera o departamento al que pertenece el elector. */
  @Column('text', { nullable: false })
  carrera: string;

  /** Facultad universitaria a la que pertenece el elector. */
  @Column('text', { nullable: false, default: '' })
  facultad: string;

  /** Código institucional de la facultad (Cod.Fac.). */
  @Column('text', { nullable: true })
  codFacultad: string | null;

  /** Código de carrera/plan (CARR-PL); solo aplica a estudiantes. */
  @Column('text', { nullable: true })
  codCarrera: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
