import { Module } from '@nestjs/common';
import { BiometriaController } from './biometria.controller';
import { BiometriaService } from './biometria.service';
import { ElectoresModule } from '../electores/electores.module';

@Module({
  imports: [ElectoresModule],
  controllers: [BiometriaController],
  providers: [BiometriaService],
})
export class BiometriaModule { }
