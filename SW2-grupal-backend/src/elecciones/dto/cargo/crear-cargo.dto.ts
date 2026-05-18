import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO para crear un cargo vinculado a una elección.
 * El cargo siempre debe pertenecer a una elección concreta al momento
 * de su creación — no puede existir como entidad huérfana.
 */
export class CrearCargoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  facultad: string;

  /** UUID de la elección a la que pertenece este cargo. */
  @IsUUID()
  @IsNotEmpty()
  eleccionId: string;
}
