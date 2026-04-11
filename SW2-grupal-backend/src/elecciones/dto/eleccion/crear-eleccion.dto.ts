import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
  fecha: string;

  @IsOptional()
  @IsBoolean()
  restriccionAlfabeticaActiva?: boolean;

  @IsBoolean()
  estaActiva: boolean;
}
