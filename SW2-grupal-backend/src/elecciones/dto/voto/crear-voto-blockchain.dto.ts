import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO heredado para la votación en blockchain de prueba.
 * Modificado para hacer opcional la privateKey por seguridad.
 */
export class CrearVotoBlockchainDto {
  @IsInt()
  @Min(0)
  candidatoId: number;

  @IsString()
  @IsOptional()
  privateKey?: string;
}
