import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

export interface EstadoNodo {
  url: string;
  activo: boolean;
  alturaBloque: number | null;
  latenciaMs: number | null;
  ultimaConexion: string | null;
  error?: string;
}

/**
 * Servicio para monitorear el estado de los nodos RPC de la red blockchain (CU-04).
 */
@Injectable()
export class NodosService {
  private readonly logger = new Logger(NodosService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Devuelve la lista de URLs de nodos configurados en NODOS_RPC_URLS.
   */
  private obtenerUrlsNodos(): string[] {
    const raw = this.configService.get<string>('nodos_rpc_urls') ?? 'http://127.0.0.1:8545';
    return raw
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  /**
   * Verifica la salud de un nodo RPC individual.
   * @param url URL del nodo RPC a verificar.
   * @returns Estado del nodo con altura de bloque y latencia.
   */
  async verificarSaludNodo(url: string): Promise<EstadoNodo> {
    const inicio = Date.now();
    try {
      const provider = new ethers.JsonRpcProvider(url);
      // Timeout de 5 segundos para no bloquear si el nodo está caído
      const alturaBloque = await Promise.race([
        provider.getBlockNumber(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al conectar con el nodo')), 5000),
        ),
      ]) as number;

      const latenciaMs = Date.now() - inicio;
      this.logger.log(`Nodo ${url} → bloque #${alturaBloque} (${latenciaMs}ms)`);

      return {
        url,
        activo: true,
        alturaBloque,
        latenciaMs,
        ultimaConexion: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nodo ${url} no responde: ${mensaje}`);
      return {
        url,
        activo: false,
        alturaBloque: null,
        latenciaMs: null,
        ultimaConexion: null,
        error: mensaje,
      };
    }
  }

  /**
   * Devuelve el estado de todos los nodos configurados en NODOS_RPC_URLS.
   * Las verificaciones se realizan en paralelo para minimizar el tiempo de respuesta.
   * @returns Lista de estados de cada nodo.
   */
  async obtenerEstadoNodos(): Promise<{
    totalNodos: number;
    nodosActivos: number;
    nodos: EstadoNodo[];
    consultadoEn: string;
  }> {
    const urls = this.obtenerUrlsNodos();
    this.logger.log(`Verificando ${urls.length} nodo(s): ${urls.join(', ')}`);

    const nodos = await Promise.all(urls.map((url) => this.verificarSaludNodo(url)));

    const nodosActivos = nodos.filter((n) => n.activo).length;

    return {
      totalNodos: nodos.length,
      nodosActivos,
      nodos,
      consultadoEn: new Date().toISOString(),
    };
  }
}
