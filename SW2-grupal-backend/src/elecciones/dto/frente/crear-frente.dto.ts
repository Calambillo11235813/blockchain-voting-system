import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO para crear un frente en un cargo.
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

  @IsUUID()
  cargoId: string;
}
