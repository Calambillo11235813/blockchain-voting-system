import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SistemasGuard } from '../../administradores/guards/sistemas.guard';
import { BlockchainService } from '../services/blockchain.service';
import { DataSource } from 'typeorm';

/**
 * Controlador de auditoría de integridad de la red blockchain (CU-20).
 *
 * Endpoints públicos:
 *   GET /auditoria/transaccion/:hash  → cualquier elector puede verificar su voto
 *
 * Endpoints protegidos (solo rol SISTEMAS):
 *   GET /auditoria/bloque/:numero     → auditoría de bloques
 *   GET /admin/auditoria/bitacora     → bitácora de transacciones
 */
@Controller()
export class AuditoriaController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Consulta la bitácora anónima de transacciones (votos).
   * Solo retorna el ID, Hash y Timestamp.
   */
  @Get('admin/auditoria/bitacora')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), SistemasGuard)
  async obtenerBitacora() {
    const bitacora = await this.dataSource.query(
      `SELECT 
         "hashTransaccion" AS "txHash", 
         MAX("fechaSufragio") AS "fecha",
         COUNT(id) AS "cantidadPapeletas",
         json_agg(id) AS "detallesVoto"
       FROM "registro_sufragio" 
       GROUP BY "hashTransaccion" 
       ORDER BY "fecha" DESC 
       LIMIT 100`
    );
    return {
      success: true,
      mensaje: 'Bitácora de transacciones.',
      datos: bitacora,
    };
  }

  /**
   * Consulta los detalles de una transacción por su hash.
   * PÚBLICO: no requiere autenticación, cualquier elector puede verificar su voto.
   * @param hash Hash de la transacción en formato 0x...
   */
  @Get('auditoria/transaccion/:hash')
  @HttpCode(HttpStatus.OK)
  async obtenerTransaccion(@Param('hash') hash: string) {
    const datos = await this.blockchainService.obtenerTransaccion(hash);
    return {
      success: true,
      mensaje: 'Transacción encontrada en la blockchain.',
      datos,
    };
  }

  /**
   * Verifica la integridad de un bloque por su número.
   * PROTEGIDO: requiere JWT y rol SISTEMAS.
   * @param numero Número de bloque a consultar.
   */
  @Get('auditoria/bloque/:numero')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), SistemasGuard)
  async verificarBloque(@Param('numero', ParseIntPipe) numero: number) {
    const datos = await this.blockchainService.verificarBloque(numero);
    return {
      success: true,
      mensaje: 'Información del bloque obtenida correctamente.',
      datos,
    };
  }
}
