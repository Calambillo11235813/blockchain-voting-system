import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainService } from './services/blockchain.service';
import { NodosService } from './services/nodos.service';
import { AuditoriaController } from './controllers/auditoria.controller';
import { NodosController } from './controllers/nodos.controller';
import { DeployController } from './controllers/deploy.controller';
import { ParametroSistema } from '../elecciones/entities/parametro-sistema.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ParametroSistema])
  ],
  controllers: [AuditoriaController, NodosController, DeployController],
  providers: [BlockchainService, NodosService],
  exports: [BlockchainService, NodosService],
})
/**
 * Modulo de integracion con blockchain.
 * Incluye servicios de votacion (CU-13), nodos (CU-04), auditoria (CU-20) y despliegue (CU-03).
 */
export class BlockchainModule {}
