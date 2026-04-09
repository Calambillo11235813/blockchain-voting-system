import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/**
 * DTO para crear una eleccion facultativa.
 */
export class CrearEleccionDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsInt()
  @Min(2000)
  gestion: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsBoolean()
  estaActiva: boolean;
}
