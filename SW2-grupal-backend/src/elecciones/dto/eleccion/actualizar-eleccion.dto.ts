import { PartialType } from '@nestjs/mapped-types';
import { CrearEleccionDto } from './crear-eleccion.dto';

/**
 * DTO para actualizar una eleccion facultativa.
 */
export class ActualizarEleccionDto extends PartialType(CrearEleccionDto) {}
