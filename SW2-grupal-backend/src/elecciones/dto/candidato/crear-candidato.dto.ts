import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

/**
 * DTO para crear un candidato en un frente.
 */
export class CrearCandidatoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,10}$/, {
    message: 'ci debe contener solo numeros (6 a 10 digitos)',
  })
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

  @IsUUID()
  frenteId: string;

  /** Papeleta concreta (EleccionCargo) a la que postula el candidato. */
  @IsUUID()
  eleccionCargoId: string;

  /** Rol dentro de la fórmula de la papeleta (ej. Rector, Decano). */
  @IsString()
  @IsNotEmpty()
  rolEspecifico: string;
}
