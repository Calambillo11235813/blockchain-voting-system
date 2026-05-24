import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para la emisión de un voto digital seguro.
 * Protege la privacidad del elector al no enviar claves privadas ni datos sensibles.
 */
export class EmitirVotoDto {
  @IsUUID('4', { message: 'El ID de la elección debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la elección es requerido.' })
  eleccionId: string;

  @IsUUID('4', { message: 'El ID del elector debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del elector es requerido.' })
  electorId: string;

  @IsUUID('4', { message: 'El ID del candidato debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del candidato es requerido.' })
  candidatoId: string;
}
