import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Elector } from '../src/electores/entities/elector.entity';
import { splitNombreCompleto } from '../src/elecciones/services/padron/padron-name-splitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
  const registro = process.argv[2];
  const nombreCompletoArg = process.argv.slice(3).join(' ').trim();

  if (!registro) {
    console.error('Uso: npx ts-node scripts/corregir-nombre-elector.ts <registro> [nombre completo original]');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const electorRepo: Repository<Elector> = app.get(getRepositoryToken(Elector));

  const elector = await electorRepo.findOne({
    where: [{ registro }, { registroDocente: registro }],
  });

  if (!elector) {
    console.error(`No se encontró elector con registro ${registro}`);
    await app.close();
    process.exit(1);
  }

  const nombreCompleto = nombreCompletoArg || `${elector.nombre} ${elector.apellido}`.trim();
  const split = splitNombreCompleto(nombreCompleto);

  console.log('Nombre completo reconstruido:', nombreCompleto);
  console.log('Split propuesto:', split);

  elector.nombre = split.nombre;
  elector.apellido = split.apellido;
  await electorRepo.save(elector);

  console.log('Elector actualizado correctamente.');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
