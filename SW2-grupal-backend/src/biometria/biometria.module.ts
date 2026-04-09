import { Module } from '@nestjs/common';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';
import { BiometriaController } from './biometria.controller';
import { BiometriaService } from './biometria.service';

@Module({
  imports: [EstudiantesModule],
  controllers: [BiometriaController],
  providers: [BiometriaService],
})
export class BiometriaModule { }
