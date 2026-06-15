import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Elector } from '../src/electores/entities/elector.entity';
import { RegistroSufragio } from '../src/elecciones/entities/registro-sufragio.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const electorRepo: Repository<Elector> = app.get(getRepositoryToken(Elector));
  const registroSufragioRepo: Repository<RegistroSufragio> = app.get(getRepositoryToken(RegistroSufragio));

  const mysteriousId = 'e72adc6c-d610-4823-84b5-9da9df49744f';
  console.log(`Buscando elector misterioso: ${mysteriousId}`);
  const myster = await electorRepo.findOne({ where: { id: mysteriousId } });
  if (myster) {
    console.log(`Elector misterioso encontrado: ${myster.nombre} ${myster.apellido} - Registro: ${myster.registro}`);
  } else {
    console.log('Elector misterioso no existe.');
  }

  const registroStr = '221045686';
  console.log(`\nBuscando todos los electores con registro: ${registroStr}`);
  const electores = await electorRepo.find({ where: { registro: registroStr } });
  for (const e of electores) {
    console.log(`- ${e.nombre} ${e.apellido} - ID: ${e.id}`);
  }
    
  // Prevent background crons from keeping the process alive
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
