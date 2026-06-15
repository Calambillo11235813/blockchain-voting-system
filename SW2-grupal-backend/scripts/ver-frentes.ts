import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EleccionCargo } from '../src/elecciones/entities/eleccion-cargo.entity';
import { Frente } from '../src/elecciones/entities/frente.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const eleccionCargoRepo: Repository<EleccionCargo> = app.get(getRepositoryToken(EleccionCargo));
  const frenteRepo: Repository<Frente> = app.get(getRepositoryToken(Frente));

  console.log('--- FRENTES EN LA BASE DE DATOS ---');
  const frentes = await frenteRepo.find();
  for (const f of frentes) {
    console.log(`- ${f.nombreFrente} (${f.sigla}) - ID: ${f.id}`);
  }

  console.log('\n--- CARGOS Y SUS FRENTES ASOCIADOS ---');
  const cargos = await eleccionCargoRepo.find({ relations: ['frentes', 'eleccion', 'cargo'] });
  for (const c of cargos) {
    console.log(`\nCargo: ${c.cargo.nombre} (Elección: ${c.eleccion.titulo})`);
    if (!c.frentes || c.frentes.length === 0) {
      console.log('  └─ Sin frentes registrados');
    } else {
      for (const f of c.frentes) {
        console.log(`  └─ Frente: ${f.nombreFrente} (${f.sigla})`);
      }
    }
  }

  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
