import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SistemasGuard } from '../../administradores/guards/sistemas.guard';
import { BlockchainService } from '../services/blockchain.service';

/**
 * Controlador para el despliegue y consulta de smart contracts (CU-03).
 *
 * Endpoints protegidos (solo rol SISTEMAS):
 *   GET  /admin/blockchain/contract-info  → información del contrato actual
 *   POST /admin/blockchain/deploy         → desplegar nuevo contrato
 */
@Controller('admin/blockchain')
@UseGuards(AuthGuard('jwt'), SistemasGuard)
export class DeployController {
  constructor(private readonly blockchainService: BlockchainService) {}

  /**
   * Obtiene información del contrato actualmente configurado.
   * Incluye: dirección, admin wallet, total votos, red y si tiene código desplegado.
   */
  @Get('contract-info')
  @HttpCode(HttpStatus.OK)
  async getContractInfo() {
    const info = await this.blockchainService.getContractInfo();
    return {
      success: true,
      mensaje: 'Información del contrato obtenida correctamente.',
      datos: info,
    };
  }

  /**
   * Despliega una nueva instancia del contrato Votacion en la blockchain.
   * Usa la llave privada configurada en las variables de entorno del backend.
   */
  @Post('deploy')
  @HttpCode(HttpStatus.CREATED)
  async deployContract(@Req() req: any) {
    const resultado = await this.blockchainService.deployContract();
    
    // Guardar automáticamente la nueva dirección en la base de datos
    await this.blockchainService.guardarDireccionContrato(
      resultado.contractAddress,
      req.user?.id
    );

    return {
      success: true,
      mensaje: 'Contrato desplegado exitosamente en la blockchain.',
      datos: resultado,
    };
  }
}
