import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CrearCandidatoDto {
  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsString()
  @IsOptional()
  fotoUrl?: string;
}

/**
 * DTO para crear un frente en un EleccionCargo específico.
 */
export class CrearFrenteDto {
  @IsString()
  @IsNotEmpty()
  nombreFrente: string;

  @IsString()
  @IsNotEmpty()
  sigla: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  esOpcionGlobal?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CrearCandidatoDto)
  candidatos?: CrearCandidatoDto[];
}
