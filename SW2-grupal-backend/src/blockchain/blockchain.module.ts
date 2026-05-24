import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './services/blockchain.service';
import { NodosService } from './services/nodos.service';
import { AuditoriaController } from './controllers/auditoria.controller';
import { NodosController } from './controllers/nodos.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AuditoriaController, NodosController],
  providers: [BlockchainService, NodosService],
  exports: [BlockchainService, NodosService],
})
/**
 * Modulo de integracion con blockchain.
 * Incluye servicios de votacion (CU-13), nodos (CU-04) y auditoria (CU-20).
 */
export class BlockchainModule {}
