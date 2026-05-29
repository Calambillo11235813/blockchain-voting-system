import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SistemasGuard } from '../../administradores/guards/sistemas.guard';
import { NodosService } from '../services/nodos.service';

/**
 * Controlador de administración de nodos de la red blockchain (CU-04).
 * Todos los endpoints están protegidos y requieren rol SISTEMAS.
 */
@Controller('admin/nodos')
@UseGuards(AuthGuard('jwt'), SistemasGuard)
export class NodosController {
  constructor(private readonly nodosService: NodosService) {}

  /**
   * Devuelve el estado actual de todos los nodos RPC configurados.
   * GET /admin/nodos/estado
   * Protegido: requiere JWT + rol SISTEMAS.
   */
  @Get('estado')
  @HttpCode(HttpStatus.OK)
  async obtenerEstadoNodos() {
    const nodos = await this.nodosService.obtenerEstadoNodos();
    const activos = nodos.filter((n) => n.estado === 'activo' || n.estado === 'lento').length;
    return {
      success: true,
      mensaje: `Se verificaron ${nodos.length} nodo(s). Activos: ${activos}.`,
      nodos,
      datos: nodos,
      data: nodos, // IMPORTANT: El frontend nodosService.js busca response?.data?.data
    };
  }

  /**
   * Verifica la salud de un nodo RPC específico por su URL (codificada en base64).
   * GET /admin/nodos/verificar/:urlBase64
   * Protegido: requiere JWT + rol SISTEMAS.
   * @param urlBase64 URL del nodo codificada en base64 para evitar conflictos con slashes en la ruta.
   */
  @Get('verificar/:urlBase64')
  @HttpCode(HttpStatus.OK)
  async verificarNodo(@Param('urlBase64') urlBase64: string) {
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');
    const nodo = await this.nodosService.verificarSaludNodo(url);
    return {
      success: true,
      mensaje: (nodo.estado === 'activo' || nodo.estado === 'lento')
        ? `Nodo activo en bloque #${nodo.bloque_actual}.`
        : `Nodo inaccesible: ${nodo.error}`,
      datos: nodo,
    };
  }
}
