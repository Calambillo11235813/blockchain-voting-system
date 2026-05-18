import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ─── Entidades ────────────────────────────────────────────────────────────────
import { Eleccion } from './entities/eleccion.entity';
import { Cargo } from './entities/cargo.entity';
import { EleccionCargo } from './entities/eleccion-cargo.entity';
import { Frente } from './entities/frente.entity';
import { Candidato } from './entities/candidato.entity';
import { PadronElectoral } from './entities/padron-electoral.entity';
import { RegistroSufragio } from './entities/registro-sufragio.entity';
import { Elector } from '../electores/entities/elector.entity';

// ─── Servicios Legacy (código funcional preservado) ───────────────────────────
import { EleccionesLegacyService } from './services/elecciones.service';
import { CargoService } from './services/cargo.service';
import { FrenteService } from './services/frente.service';
import { CandidatoService } from './services/candidato.service';
import { PapeletaService } from './services/papeleta.service';

// ─── Servicios Nuevos (submodularización por RF) ─────────────────────────────
import { PadronService } from './services/padron.service';
import { JornadaService } from './services/jornada.service';
import { EscrutinioService } from './services/escrutinio.service';

// ─── Controladores ───────────────────────────────────────────────────────────
import { EleccionesController } from './controllers/elecciones.controller';
import { CargoController } from './controllers/cargo.controller';
import { FrenteController } from './controllers/frente.controller';
import { CandidatoController } from './controllers/candidato.controller';
import { PapeletaController } from './controllers/papeleta.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Entidades del dominio de elecciones
      Eleccion,
      Cargo,
      EleccionCargo,
      Frente,
      Candidato,
      PadronElectoral,
      RegistroSufragio, // Requerido por PadronService para la validación de doble voto (RF6)
      // Entidad externa necesaria para PadronService
      Elector,
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
    // Legacy (preservado)
    EleccionesLegacyService,
    CargoService,
    FrenteService,
    CandidatoService,
    PapeletaService,
    // Nuevos sub-servicios
    PadronService,
    JornadaService,
    EscrutinioService,
  ],
  exports: [
    // Legacy — consumido por AuthModule y guards existentes
    EleccionesLegacyService,
    // Nuevos — disponibles para otros módulos
    PadronService,
    JornadaService,
    EscrutinioService,
  ],
})
export class EleccionesModule {}