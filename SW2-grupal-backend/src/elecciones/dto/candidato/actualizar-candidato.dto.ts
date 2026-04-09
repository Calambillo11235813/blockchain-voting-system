import { PartialType } from '@nestjs/mapped-types';
import { CrearCandidatoDto } from './crear-candidato.dto';

/**
 * DTO para actualizar un candidato.
 */
export class ActualizarCandidatoDto extends PartialType(CrearCandidatoDto) {}
