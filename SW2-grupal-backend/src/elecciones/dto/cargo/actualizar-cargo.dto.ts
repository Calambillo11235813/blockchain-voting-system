import { PartialType } from '@nestjs/mapped-types';
import { CrearCargoDto } from './crear-cargo.dto';

/**
 * DTO para actualizar un cargo.
 */
export class ActualizarCargoDto extends PartialType(CrearCargoDto) {}
