import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsUuidOrVotoBlanco } from './is-uuid-or-voto-blanco.decorator';

/**
 * Selección individual dentro de un lote de votación (flujo Crucero).
 */
export class SeleccionVotoDto {
  @IsUUID('4', { message: 'El ID de la papeleta debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la papeleta (eleccionCargo) es requerido.' })
  eleccionCargoId: string;

  @IsNotEmpty({ message: 'El ID del candidato es requerido.' })
  @IsUuidOrVotoBlanco({ message: 'El ID del candidato debe ser un UUID válido o el valor exacto "BLANCO".' })
  candidatoId: string;
}

/**
 * DTO para emitir un lote de votos en una sola transacción blockchain.
 * El electorId se obtiene del JWT autenticado, no del body.
 */
export class EmitirVotoBatchDto {
  @IsUUID('4', { message: 'El ID de la elección debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la elección es requerido.' })
  eleccionId: string;

  @IsArray({ message: 'Las selecciones deben ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debe enviar al menos una selección.' })
  @ValidateNested({ each: true })
  @Type(() => SeleccionVotoDto)
  selecciones: SeleccionVotoDto[];
}
