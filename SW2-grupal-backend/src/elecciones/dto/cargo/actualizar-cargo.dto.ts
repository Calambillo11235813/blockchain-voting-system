import { IsOptional, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CrearCargoDto } from './crear-cargo.dto';

/**
 * DTO para actualizar un cargo.
 * Hereda nombre y facultad como opcionales desde CrearCargoDto.
 * Agrega eleccionId para permitir reasignar la vinculación a una elección.
 */
export class ActualizarCargoDto extends PartialType(CrearCargoDto) {
  /** UUID de la elección a la que se reasigna este cargo. */
  @IsOptional()
  @IsUUID()
  eleccionId?: string;
}

