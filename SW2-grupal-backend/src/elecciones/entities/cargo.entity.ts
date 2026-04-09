import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { Frente } from 'src/elecciones/entities/frente.entity';

/**
 * Entidad que representa un cargo en disputa dentro de una eleccion.
 */
@Entity('cargo')
export class Cargo {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('text', { nullable: false })
	nombre: string;

	@Column('text', { nullable: false })
	facultad: string;

	@ManyToOne(() => Eleccion, (eleccion) => eleccion.cargos, {
		nullable: false,
		onDelete: 'CASCADE',
	})
	eleccion: Eleccion;

	@OneToMany(() => Frente, (frente) => frente.cargo, { cascade: false })
	frentes: Frente[];
}
