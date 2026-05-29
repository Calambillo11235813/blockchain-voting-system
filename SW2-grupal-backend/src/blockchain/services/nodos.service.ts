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
  private estadoNodos: any[] = [];

  constructor(private readonly configService: ConfigService) {
    // Inicializar el estado de inmediato y luego hacer polling cada 10 segundos en segundo plano
    this.actualizarEstadoNodos();
    setInterval(() => this.actualizarEstadoNodos(), 10000);
  }

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
   */
  async verificarSaludNodo(url: string): Promise<any> {
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
        estado: latenciaMs > 500 ? 'lento' : 'activo',
        bloque_actual: alturaBloque,
        latencia: latenciaMs,
        ultima_verificacion: new Date().toLocaleString(),
      };
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nodo ${url} no responde: ${mensaje}`);
      return {
        url,
        estado: 'inactivo',
        bloque_actual: null,
        latencia: null,
        ultima_verificacion: new Date().toLocaleString(),
        error: mensaje,
      };
    }
  }

  /**
   * Función interna que hace el ping a los nodos y actualiza el estado en memoria.
   */
  private async actualizarEstadoNodos(): Promise<void> {
    const urls = this.obtenerUrlsNodos();
    
    // Si no es la primera vez, evitamos loguear siempre la lista completa para no ensuciar, 
    // pero mantenemos los logs individuales dentro de verificarSaludNodo
    const nodosActualizados = await Promise.all(urls.map((url) => this.verificarSaludNodo(url)));
    
    // Actualizamos la variable en memoria con el array de resultados
    this.estadoNodos = nodosActualizados;
  }

  /**
   * Endpoint llamado por el controlador (GET /admin/nodos/estado)
   * Simplemente retorna el estado en memoria para que responda rápido al frontend.
   * @returns Lista de estados de cada nodo.
   */
  async obtenerEstadoNodos(): Promise<any[]> {
    return this.estadoNodos;
  }
}
