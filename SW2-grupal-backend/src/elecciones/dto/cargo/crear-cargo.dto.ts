import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO para crear un cargo dentro de una eleccion.
 */
export class CrearCargoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  facultad: string;

  @IsUUID()
  eleccionId: string;
}
