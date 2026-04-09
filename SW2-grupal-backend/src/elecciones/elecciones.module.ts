import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Eleccion } from './entities/eleccion.entity';
import { Cargo } from './entities/cargo.entity';
import { Frente } from './entities/frente.entity';
import { Candidato } from './entities/candidato.entity';
import { EleccionesService } from './services/elecciones.service';
import { EleccionesController } from 'src/elecciones/controllers/elecciones.controller';
import { CargoController } from './controllers/cargo.controller';
import { FrenteController } from './controllers/frente.controller';
import { CandidatoController } from './controllers/candidato.controller';
import { PapeletaController } from './controllers/papeleta.controller';
import { CargoService } from './services/cargo.service';
import { FrenteService } from './services/frente.service';
import { CandidatoService } from './services/candidato.service';
import { PapeletaService } from './services/papeleta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Eleccion,
      Cargo,
      Frente,
      Candidato,
    ]),
  ],
  controllers: [
    EleccionesController,
    CargoController,
    FrenteController,
    CandidatoController,
    PapeletaController,
  ],
  providers: [
    EleccionesService,
    CargoService,
    FrenteService,
    CandidatoService,
    PapeletaService,
  ],
  exports: [
    EleccionesService,
  ],
})
export class EleccionesModule { }