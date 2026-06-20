import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Elector } from './entities/elector.entity';

/**
 * Servicio central de consultas de identidad del catálogo maestro de electores.
 *
 * Responsabilidad única: proveer búsquedas tipadas de Elector al resto del
 * backend (AuthModule, BiometriaModule, PadronService, etc.).
 * La carga masiva y habilitación por comicio está delegada a PadronService.
 */
@Injectable()
export class ElectoresService {
  constructor(
    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,
  ) {}

  /**
   * Busca un elector por su número de registro universitario.
   * Lanza una excepción clara si no existe.
   *
   * @param registro  Registro universitario del elector.
   * @returns Entidad Elector encontrada.
   * @throws NotFoundException si no se encuentra ningún elector con ese registro.
   */
  async buscarPorRegistro(registro: string): Promise<Elector> {
    const normalized = String(registro || '').trim();
    if (normalized.length === 0) {
      throw new NotFoundException('El registro proporcionado está vacío.');
    }

    const elector = await this.electorRepository.findOne({
      where: [
        { registro: normalized },
        { registroDocente: normalized },
      ],
    });

    if (!elector) {
      throw new NotFoundException(
        `No se encontró un elector con registro '${normalized}'.`,
      );
    }

    return elector;
  }

  /**
   * Busca un elector por su cédula de identidad (CI).
   * Retorna null si no existe (no lanza excepción).
   *
   * @param ci  Cédula de identidad del elector.
   * @returns Entidad Elector o null si no se encuentra.
   */
  async buscarPorCi(ci: string): Promise<Elector | null> {
    const normalized = String(ci || '').trim();
    if (normalized.length === 0) {
      return null;
    }

    return this.electorRepository.findOne({
      where: { ci: normalized },
    });
  }

  /**
   * Cuenta el total de estudiantes registrados en el sistema.
   */
  async contarEstudiantes(): Promise<number> {
    return this.electorRepository.count({
      where: { estamento: 'ESTUDIANTE' as any },
    });
  }
}
