import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import NodeCache from 'node-cache';
import { ParametroSistema } from '../entities/parametro-sistema.entity';

@Injectable()
export class ConfiguracionService {
  private readonly cache: NodeCache;

  constructor(
    @InjectRepository(ParametroSistema)
    private readonly parametroRepository: Repository<ParametroSistema>,
  ) {
    // Instanciar caché con un TTL por defecto de 300 segundos (5 minutos)
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  /**
   * Obtiene el valor parseado según su tipo.
   * Consulta primero la caché en memoria, y como fallback la base de datos.
   */
  async obtenerValor(clave: string, defaultValue?: any): Promise<any> {
    const cached = this.cache.get(clave);
    if (cached !== undefined) {
      return cached;
    }

    const parametro = await this.parametroRepository.findOne({
      where: { clave },
    });

    if (!parametro) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    const parsed = this.parsearValor(parametro.valor, parametro.tipo);
    this.cache.set(clave, parsed);
    return parsed;
  }

  /**
   * Lista todos los parámetros almacenados en la base de datos.
   */
  async obtenerTodos(): Promise<ParametroSistema[]> {
    return this.parametroRepository.find({
      order: { clave: 'ASC' },
    });
  }

  /**
   * Actualiza o crea un parámetro de configuración.
   * Valida la compatibilidad del tipo de dato e invalida la caché correspondiente.
   */
  async actualizarParametro(
    clave: string,
    valor: string,
    adminId: string,
    descripcion?: string,
  ): Promise<ParametroSistema> {
    let parametro = await this.parametroRepository.findOne({
      where: { clave },
    });

    let tipo: 'string' | 'number' | 'boolean' | 'json';

    if (parametro) {
      tipo = parametro.tipo;
      // Validar que el valor recibido sea compatible con el tipo actual
      if (!this.validarValor(valor, tipo)) {
        throw new BadRequestException(
          `El valor proporcionado no es compatible con el tipo '${tipo}' del parámetro.`,
        );
      }
    } else {
      // Si no existe, se infiere el tipo a partir del valor provisto
      tipo = this.inferirTipo(valor);
      parametro = new ParametroSistema();
      parametro.clave = clave;
    }

    parametro.valor = valor.trim();
    parametro.tipo = tipo;
    parametro.actualizadoPor = adminId;
    if (descripcion !== undefined) {
      parametro.descripcion = descripcion;
    }

    const guardado = await this.parametroRepository.save(parametro);

    // Invalida la entrada en la caché
    this.cache.del(clave);

    return guardado;
  }

  /**
   * Limpia toda la caché en memoria.
   */
  async eliminarParametro(clave: string): Promise<void> {
    const p = await this.parametroRepository.findOne({ where: { clave } });
    if (!p) throw new NotFoundException('No existe');
    await this.parametroRepository.remove(p);
    this.cache.del(clave);
  }

  recargarCache(): void {
    this.cache.flushAll();
  }

  // ─── Métodos de Utilidad Privados ───────────────────────────────────────────

  /**
   * Convierte la representación string del valor al tipo nativo correspondiente.
   */
  private parsearValor(
    valor: string,
    tipo: 'string' | 'number' | 'boolean' | 'json',
  ): any {
    const valTrim = valor.trim();
    switch (tipo) {
      case 'number':
        const num = Number(valTrim);
        return isNaN(num) ? null : num;
      case 'boolean':
        return valTrim.toLowerCase() === 'true';
      case 'json':
        try {
          return JSON.parse(valTrim);
        } catch {
          return null;
        }
      case 'string':
      default:
        return valor;
    }
  }

  /**
   * Valida si un string se puede convertir correctamente al tipo de parámetro.
   */
  private validarValor(
    valor: string,
    tipo: 'string' | 'number' | 'boolean' | 'json',
  ): boolean {
    const valTrim = valor.trim();
    switch (tipo) {
      case 'number':
        return !isNaN(Number(valTrim)) && valTrim !== '';
      case 'boolean':
        const lower = valTrim.toLowerCase();
        return lower === 'true' || lower === 'false';
      case 'json':
        try {
          const parsed = JSON.parse(valTrim);
          return typeof parsed === 'object' && parsed !== null;
        } catch {
          return false;
        }
      case 'string':
      default:
        return true;
    }
  }

  /**
   * Infiere automáticamente el tipo de datos de un string para nuevos parámetros.
   */
  private inferirTipo(valor: string): 'string' | 'number' | 'boolean' | 'json' {
    const valTrim = valor.trim();

    // 1. Detección de booleanos
    if (valTrim.toLowerCase() === 'true' || valTrim.toLowerCase() === 'false') {
      return 'boolean';
    }

    // 2. Detección de números
    if (/^-?\d+(\.\d+)?$/.test(valTrim)) {
      return 'number';
    }

    // 3. Detección de JSON (objetos/arrays)
    try {
      const parsed = JSON.parse(valTrim);
      if (typeof parsed === 'object' && parsed !== null) {
        return 'json';
      }
    } catch {}

    // 4. Default a string
    return 'string';
  }
}
