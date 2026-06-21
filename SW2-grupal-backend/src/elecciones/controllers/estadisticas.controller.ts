import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';
import { ElectoralGuard } from 'src/administradores/guards/electoral.guard';
import { EstadisticasService } from '../services/estadisticas.service';
import { ApiResponse } from 'src/compartido/respuesta';
import {
  EstadisticasEstamentoDetalle,
  EstadisticasJerarquicas,
  EstadisticasParticipacion,
} from '../services/estadisticas.service';
import { EscrutinioService, ReporteConsolidacion } from '../services/escrutinio.service';

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
  constructor(
    private readonly estadisticasService: EstadisticasService,
    private readonly escrutinioService: EscrutinioService
  ) {}

  /**
   * CU-18: Generar reporte de consolidación paritaria.
   *
   * Devuelve el acta de consolidación con los resultados ponderados (50/50)
   * del escrutinio y el frente ganador.
   *
   * @param eleccionId UUID de la elección a consultar.
   * @returns ReporteConsolidacion con la información del escrutinio.
   *
   * @example GET /estadisticas/escrutinio/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('escrutinio/:eleccionId')
  @UseGuards(AuthGuard('jwt'), ElectoralGuard)
  async generarReporteConsolidacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<ReporteConsolidacion>> {
    return this.escrutinioService.generarReporteConsolidacion(eleccionId);
  }

  /**
   * Descarga el Acta de Consolidación Paritaria en formato PDF.
   */
  @Get('escrutinio/:eleccionId/pdf')
  @UseGuards(AuthGuard('jwt'), ElectoralGuard)
  async descargarActaPDF(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Res() res: any,
  ) {
    const pdfBuffer = await this.escrutinioService.generarActaPDF(eleccionId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="acta_consolidacion_${eleccionId.slice(0,8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
  }

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
   * Estadísticas jerárquicas por papeleta (Global, Facultad, Carrera).
   *
   * @example GET /estadisticas/jerarquicas/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('jerarquicas/:eleccionId')
  async obtenerEstadisticasJerarquicas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<EstadisticasJerarquicas>> {
    return this.estadisticasService.obtenerEstadisticasJerarquicas(eleccionId);
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
