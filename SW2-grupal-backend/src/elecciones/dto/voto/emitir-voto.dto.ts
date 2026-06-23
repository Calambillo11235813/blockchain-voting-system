import { IsNotEmpty } from 'class-validator';
import { IsUuidLike } from './is-uuid-like.decorator';

/**
 * DTO para la emisión de un voto digital seguro.
 */
export class EmitirVotoDto {
  @IsUuidLike({ message: 'El ID de la elección debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la elección es requerido.' })
  eleccionId: string;

  @IsUuidLike({ message: 'El ID de la papeleta debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la papeleta (eleccionCargo) es requerido.' })
  eleccionCargoId: string;

  @IsUuidLike({ message: 'El ID del elector debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del elector es requerido.' })
  electorId: string;

  @IsUuidLike({ message: 'El ID del candidato debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del candidato es requerido.' })
  candidatoId: string;
}
