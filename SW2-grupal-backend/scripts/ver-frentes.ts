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
  const frentes = await frenteRepo.find({ relations: ['eleccion'] });
  for (const f of frentes) {
    console.log(`- ${f.nombreFrente} (${f.sigla}) - Elección: ${f.eleccion?.titulo ?? 'N/A'} - ID: ${f.id}`);
  }

  console.log('\n--- PAPELETAS Y FRENTES (vía candidatos) ---');
  const cargos = await eleccionCargoRepo.find({
    relations: ['candidatos', 'candidatos.frente', 'eleccion', 'cargo'],
  });
  for (const c of cargos) {
    console.log(`\nPapeleta: ${c.cargo.nombre} (Elección: ${c.eleccion.titulo})`);
    const frentesMap = new Map<string, Frente>();
    for (const candidato of c.candidatos ?? []) {
      if (candidato.frente) {
        frentesMap.set(candidato.frente.id, candidato.frente);
      }
    }
    if (frentesMap.size === 0) {
      console.log('  └─ Sin frentes con candidatos en esta papeleta');
    } else {
      for (const f of frentesMap.values()) {
        console.log(`  └─ Frente: ${f.nombreFrente} (${f.sigla})`);
      }
    }
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
