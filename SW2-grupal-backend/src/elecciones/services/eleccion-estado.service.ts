import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { EstadoEleccionEnum } from '../enums/estado-eleccion.enum';

/**
 * Validaciones de estado del ciclo de vida electoral.
 */
@Injectable()
export class EleccionEstadoService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
  ) {}

  /**
   * Impide mutaciones cuando la elección ya fue sellada o está activa.
   */
  async assertEnConfiguracion(eleccionId: string): Promise<void> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    if (eleccion.estado !== EstadoEleccionEnum.EN_CONFIGURACION) {
      throw new ForbiddenException(
        'La elección está sellada. No se pueden modificar el padrón, frentes ni candidatos.',
      );
    }
  }

  async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });

    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    return eleccion;
  }
}
