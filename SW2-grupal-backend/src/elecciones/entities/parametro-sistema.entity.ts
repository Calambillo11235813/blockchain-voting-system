import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parametros_sistema')
export class ParametroSistema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clave: string; // ej: 'GEMINI_API_KEY', 'BIOMETRIA_UMBRAL_SIMILITUD'

  @Column({ type: 'text' })
  valor: string; // valor almacenado (siempre string, se parsea al usar)

  @Column({ nullable: true })
  descripcion: string; // explicación de para qué sirve

  @Column({ default: 'string' })
  tipo: 'string' | 'number' | 'boolean' | 'json'; // para validación y parseo

  @Column({ nullable: true })
  actualizadoPor: string; // UUID del administrador que hizo el cambio

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
