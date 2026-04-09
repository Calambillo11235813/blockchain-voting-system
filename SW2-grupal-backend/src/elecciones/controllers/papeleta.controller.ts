import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PapeletaCompleta, PapeletaService } from 'src/elecciones/services/papeleta.service';

/**
 * Controlador de consultas de papeleta.
 */
@Controller('elecciones')
export class PapeletaController {
  constructor(private readonly papeletaService: PapeletaService) {}

  /**
   * Obtiene la papeleta completa de una eleccion.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Papeleta completa anidada.
   */
  @Get(':eleccionId/papeleta')
  async obtenerPapeletaCompleta(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<PapeletaCompleta> {
    return this.papeletaService.obtenerPapeletaCompleta(eleccionId);
  }
}
