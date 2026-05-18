import { Controller, Get, Param } from '@nestjs/common';
import { ElectoresService } from './electores.service';
import { Elector } from './entities/elector.entity';

/**
 * Controlador del catálogo maestro de electores.
 * Expone endpoints de consulta de identidad para el panel administrativo.
 *
 * Prefijo de ruta: api/electores
 * Seguridad: los Guards de autenticación de administrador se aplicarán
 * a nivel de ruta cuando se integre el módulo de autenticación.
 */
@Controller('api/electores')
export class ElectoresController {
  constructor(private readonly electoresService: ElectoresService) {}

  /**
   * GET api/electores/:registro
   *
   * Consulta el perfil global de un elector por su registro universitario.
   * Retorna todos los datos de identidad del catálogo maestro.
   *
   * @param registro  Número de registro universitario.
   * @returns Datos completos del elector.
   * @throws NotFoundException si el elector no existe.
   */
  @Get(':registro')
  async obtenerElectorPorRegistro(
    @Param('registro') registro: string,
  ): Promise<Elector> {
    return this.electoresService.buscarPorRegistro(registro);
  }
}
