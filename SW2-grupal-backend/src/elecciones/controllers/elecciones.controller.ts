import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ElectoralGuard } from 'src/administradores/guards/electoral.guard';
import { EleccionesLegacyService } from '../services/elecciones.service';
import { PadronService } from '../services/padron.service';
import { FrenteService } from '../services/frente.service';
import { JornadaService } from '../services/jornada.service';
import { ApiResponse } from 'src/compartido/respuesta';
import { Eleccion } from '../entities/eleccion.entity';
import { Frente } from '../entities/frente.entity';
import { CrearEleccionDto } from '../dto/eleccion/crear-eleccion.dto';
import { ActualizarEleccionDto } from '../dto/eleccion/actualizar-eleccion.dto';
import { CrearFrenteDto } from '../dto/frente/crear-frente.dto';

/**
 * Controlador del dominio de elecciones facultativas.
 */
@Controller('elecciones')
export class EleccionesController {
  constructor(
    private readonly eleccionesService: EleccionesLegacyService,
    private readonly padronService: PadronService,
    private readonly frenteService: FrenteService,
    private readonly jornadaService: JornadaService,
  ) {}

  /**
   * Crea una eleccion facultativa.
   * @param crearEleccionDto Datos de la eleccion.
   * @returns Eleccion creada.
   */
  @Post()
  async crearEleccion(
    @Body() crearEleccionDto: CrearEleccionDto,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.crearEleccion(crearEleccionDto);
  }

  /**
   * Lista todas las elecciones.
   * @returns Lista de elecciones.
   */
  @Get()
  async listarElecciones(): Promise<ApiResponse<Eleccion[]>> {
    return this.eleccionesService.listarElecciones();
  }

  /**
   * Obtiene una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion encontrada.
   */
  @Get(':eleccionId')
  async obtenerEleccionPorId(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.obtenerEleccionPorId(eleccionId);
  }

  /**
   * Actualiza una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param actualizarEleccionDto Campos a actualizar.
   * @returns Eleccion actualizada.
   */
  @Patch(':eleccionId/sellar')
  async sellarEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.sellarEleccion(eleccionId);
  }

  /**
   * Abre la jornada electoral (SELLADA → ACTIVA).
   */
  @Patch(':eleccionId/abrir')
  @UseGuards(AuthGuard('jwt'), ElectoralGuard)
  async abrirJornada(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.jornadaService.controlarEstadoJornada(eleccionId, 'ABRIR');
  }

  /**
   * Cierra la jornada electoral (ACTIVA → FINALIZADA).
   */
  @Patch(':eleccionId/cerrar')
  @UseGuards(AuthGuard('jwt'), ElectoralGuard)
  async cerrarJornada(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.jornadaService.controlarEstadoJornada(eleccionId, 'CERRAR');
  }

  /**
   * Consulta el estado de la jornada sin mutarla.
   */
  @Get(':eleccionId/jornada')
  @UseGuards(AuthGuard('jwt'), ElectoralGuard)
  async obtenerEstadoJornada(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ) {
    return this.jornadaService.obtenerEstadoJornada(eleccionId);
  }

  /**
   * Actualiza una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param actualizarEleccionDto Campos a actualizar.
   * @returns Eleccion actualizada.
   */
  @Patch(':eleccionId')
  async actualizarEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() actualizarEleccionDto: ActualizarEleccionDto,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.actualizarEleccion(eleccionId, actualizarEleccionDto);
  }

  /**
   * Activa o desactiva la restricción alfabética (interruptor maestro).
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Eleccion actualizada.
   */
  @Patch(':eleccionId/toggle-restriccion')
  async toggleRestriccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Eleccion>> {
    return this.eleccionesService.toggleRestriccionAlfabetica(eleccionId);
  }

  /**
   * Elimina una eleccion por ID.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Resultado de eliminacion.
   */
  @Delete(':eleccionId')
  async eliminarEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<null>> {
    return this.eleccionesService.eliminarEleccion(eleccionId);
  }

  /**
   * Registra un frente en un proceso electoral (modelo nuevo).
   */
  @Post(':eleccionId/frentes')
  async registrarFrentePorEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() crearFrenteDto: CrearFrenteDto,
  ): Promise<ApiResponse<Frente>> {
    return this.frenteService.registrarFrentePorEleccion(eleccionId, crearFrenteDto);
  }

  /**
   * Lista los frentes de un proceso electoral.
   */
  @Get(':eleccionId/frentes')
  async listarFrentesPorEleccion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Frente[]>> {
    return this.frenteService.listarFrentesPorEleccion(eleccionId);
  }

  /**
   * Carga masiva del padrón electoral desde un archivo Excel (.xlsx).
   * @param eleccionId Identificador UUID de la eleccion.
   * @param file Archivo Excel subido.
   * @returns Estadísticas de la carga masiva.
   */
  @Post(':eleccionId/padron')
  @UseInterceptors(FileInterceptor('file'))
  async cargarPadronElectoral(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<any>> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar un archivo Excel (.xlsx) en el campo "file".');
    }

    const nombreArchivo = file.originalname?.toLowerCase() ?? '';
    const esXlsx =
      nombreArchivo.endsWith('.xlsx') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!esXlsx) {
      throw new BadRequestException('El archivo debe tener formato .xlsx.');
    }

    return this.padronService.cargarPadronElectoral(eleccionId, file.buffer);
  }

  /**
   * Catálogo de facultades distintas del padrón habilitado (para configurar papeletas).
   */
  @Get(':eleccionId/catalogo/facultades')
  async listarFacultadesPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
  ): Promise<ApiResponse<Array<{ codFacultad: string; facultadNombre: string }>>> {
    return this.padronService.obtenerFacultadesDePadron(eleccionId);
  }

  /**
   * Catálogo de carreras del padrón habilitado filtradas por facultad.
   */
  @Get(':eleccionId/catalogo/carreras')
  async listarCarrerasPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query('codFacultad') codFacultad: string,
  ): Promise<ApiResponse<Array<{ codCarrera: string; carreraNombre: string }>>> {
    return this.padronService.obtenerCarrerasDePadron(eleccionId, codFacultad);
  }

  /**
   * Lista el padrón electoral de una elección.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param page Número de página (1-indexed).
   * @param limit Registros por página.
   * @returns Lista paginada del padrón.
   */
  @Get(':eleccionId/padron')
  async listarPadronElectoral(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estamento') estamento?: string,
  ): Promise<ApiResponse<any>> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.padronService.listarPadronElectoral(eleccionId, pageNumber, limitNumber, estamento);
  }
}
