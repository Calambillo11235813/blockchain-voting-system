import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para la emisión de un voto digital seguro.
 */
export class EmitirVotoDto {
  @IsUUID('4', { message: 'El ID de la elección debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la elección es requerido.' })
  eleccionId: string;

  @IsUUID('4', { message: 'El ID de la papeleta debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la papeleta (eleccionCargo) es requerido.' })
  eleccionCargoId: string;

  @IsUUID('4', { message: 'El ID del elector debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del elector es requerido.' })
  electorId: string;

  @IsUUID('4', { message: 'El ID del candidato debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del candidato es requerido.' })
  candidatoId: string;
}
