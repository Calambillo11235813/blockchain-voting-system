import { PartialType } from '@nestjs/mapped-types';
import { CrearFrenteDto } from './crear-frente.dto';

/**
 * DTO para actualizar un frente.
 */
export class ActualizarFrenteDto extends PartialType(CrearFrenteDto) {}
