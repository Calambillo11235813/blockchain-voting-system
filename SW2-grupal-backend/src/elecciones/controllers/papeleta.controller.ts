import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PapeletaDigital, PapeletaService } from 'src/elecciones/services/papeleta.service';

/**
 * Controlador de consultas de papeleta.
 */
@Controller('elecciones')
export class PapeletaController {
  constructor(private readonly papeletaService: PapeletaService) {}

  /**
   * Obtiene la papeleta completa jerárquica de una elección.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Papeleta digital anidada.
   */
  @Get(':eleccionId/papeleta')
  async obtenerPapeletaDigital(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<PapeletaDigital> {
    return this.papeletaService.obtenerPapeletaDigital(eleccionId);
  }
}
