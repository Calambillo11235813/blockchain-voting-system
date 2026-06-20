import { Module } from '@nestjs/common';
import { BiometriaController } from './biometria.controller';
import { BiometriaService } from './biometria.service';
import { ElectoresModule } from '../electores/electores.module';
import { FaceMatchService } from './services/face-match.service';
import { OcrService } from './services/ocr.service';

@Module({
  imports: [ElectoresModule],
  controllers: [BiometriaController],
  providers: [
    BiometriaService,
    OcrService,
    FaceMatchService,
  ],
})
export class BiometriaModule { }
