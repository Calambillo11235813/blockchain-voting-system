import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CrearCandidatoAnidadoDto {
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

  /** Obligatorio al crear candidatos junto con un frente por elección. */
  @IsUUID()
  @IsOptional()
  eleccionCargoId?: string;
}

/**
 * DTO para crear un frente en un proceso electoral.
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

  /** @deprecated Legacy — no usar en nuevos frentes. */
  @IsBoolean()
  @IsOptional()
  esOpcionGlobal?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CrearCandidatoAnidadoDto)
  candidatos?: CrearCandidatoAnidadoDto[];
}
