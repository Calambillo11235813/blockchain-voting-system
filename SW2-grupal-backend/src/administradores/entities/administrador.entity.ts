import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Eleccion } from '../../elecciones/entities/eleccion.entity';

/**
 * Entidad que representa a un administrador del sistema electoral universitario.
 * Un administrador puede gestionar múltiples elecciones a lo largo del tiempo.
 */
@Entity('administradores')
export class Administrador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre(s) del administrador. */
  @Column('text', { nullable: false })
  nombre: string;

  /** Apellido(s) del administrador. */
  @Column('text', { nullable: false })
  apellido: string;

  /** Correo electrónico institucional — credencial de acceso al sistema. */
  @Index({ unique: true })
  @Column('text', { nullable: false, unique: true })
  correo: string;

  /** Contraseña hasheada con bcrypt. */
  @Column('text', { nullable: false })
  password: string;

  /** Elecciones que este administrador ha creado y gestiona. */
  @OneToMany(() => Eleccion, (eleccion) => eleccion.administrador)
  elecciones: Eleccion[];
}
