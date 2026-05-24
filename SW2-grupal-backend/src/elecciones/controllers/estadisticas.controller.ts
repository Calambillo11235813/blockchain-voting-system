import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';
import { EstadisticasService } from '../services/estadisticas.service';
import { ApiResponse } from 'src/compartido/respuesta';
import {
  EstadisticasEstamentoDetalle,
  EstadisticasParticipacion,
} from '../services/estadisticas.service';

/**
 * Controlador de Estadísticas Electorales.
 *
 * Expone los endpoints REST para consulta de participación en tiempo real
 * (polling), estadísticas estudiantiles y estadísticas docentes.
 *
 * Todos los endpoints requieren autenticación JWT válida.
 * El frontend puede invocar estos endpoints cada 5-10 segundos para
 * simular monitoreo en tiempo real (long-polling).
 *
 * Rutas base: /estadisticas
 */
@Controller('estadisticas')
@UseGuards(JwtAuthGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  /**
   * CU-15: Monitoreo de participación en tiempo real.
   *
   * Devuelve el total de habilitados, votos emitidos, porcentaje global
   * y desglose por estamento (docente / estudiante / administrativo).
   * Ideal para un dashboard de monitoreo actualizado con polling.
   *
   * @param eleccionId UUID de la elección a consultar.
   * @returns EstadisticasParticipacion con datos actualizados al momento de la llamada.
   *
   * @example GET /estadisticas/participacion/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('participacion/:eleccionId')
  async obtenerParticipacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<EstadisticasParticipacion>> {
    return this.estadisticasService.obtenerParticipacionGlobal(eleccionId);
  }

  /**
   * CU-16: Estadísticas estudiantiles.
   *
   * Devuelve la participación filtrada únicamente para el estamento ESTUDIANTE,
   * incluyendo desglose detallado por carrera universitaria.
   *
   * @param eleccionId UUID de la elección a consultar.
   * @returns EstadisticasEstamentoDetalle con datos del estamento ESTUDIANTE.
   *
   * @example GET /estadisticas/estudiantes/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('estudiantes/:eleccionId')
  async obtenerEstadisticasEstudiantes(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<EstadisticasEstamentoDetalle>> {
    return this.estadisticasService.obtenerEstadisticasEstudiantes(eleccionId);
  }

  /**
   * CU-17: Estadísticas docentes.
   *
   * Devuelve la participación filtrada únicamente para el estamento DOCENTE,
   * incluyendo desglose por departamento/carrera.
   *
   * @param eleccionId UUID de la elección a consultar.
   * @returns EstadisticasEstamentoDetalle con datos del estamento DOCENTE.
   *
   * @example GET /estadisticas/docentes/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('docentes/:eleccionId')
  async obtenerEstadisticasDocentes(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<EstadisticasEstamentoDetalle>> {
    return this.estadisticasService.obtenerEstadisticasDocentes(eleccionId);
  }
}
