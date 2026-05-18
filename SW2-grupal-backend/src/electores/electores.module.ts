import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Elector } from './entities/elector.entity';
import { ElectoresService } from './electores.service';
import { ElectoresController } from './electores.controller';

/**
 * Módulo global de identidades electorales.
 *
 * Exporta ElectoresService y TypeOrmModule para que otros módulos
 * (AutenticacionModule, BiometriaModule, EleccionesModule) puedan
 * inyectar las búsquedas de identidad de forma nativa.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Elector])],
  controllers: [ElectoresController],
  providers: [ElectoresService],
  exports: [ElectoresService, TypeOrmModule],
})
export class ElectoresModule {}
