import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Elector } from '../src/electores/entities/elector.entity';
import { PadronElectoral } from '../src/elecciones/entities/padron-electoral.entity';
import { Eleccion } from '../src/elecciones/entities/eleccion.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

function calcularPasswordEsperado(apellidos: string, ci: string): string {
  const initials = String(apellidos || '')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return `${initials}${String(ci || '').trim()}`;
}

async function bootstrap() {
  const registro = process.argv[2] || '219711353';
  const app = await NestFactory.createApplicationContext(AppModule);

  const electorRepo: Repository<Elector> = app.get(getRepositoryToken(Elector));
  const padronRepo: Repository<PadronElectoral> = app.get(getRepositoryToken(PadronElectoral));
  const eleccionRepo: Repository<Eleccion> = app.get(getRepositoryToken(Eleccion));

  const elector = await electorRepo.findOne({
    where: [{ registro }, { registroDocente: registro }],
  });

  if (!elector) {
    console.log(`NO ENCONTRADO: elector con registro ${registro}`);
    await app.close();
    process.exit(1);
  }

  console.log('=== ELECTOR ===');
  console.log(JSON.stringify({
    id: elector.id,
    registro: elector.registro,
    ci: elector.ci,
    nombre: elector.nombre,
    apellido: elector.apellido,
    estamento: elector.estamento,
    facultad: elector.facultad,
    codFacultad: elector.codFacultad,
    carrera: elector.carrera,
    codCarrera: elector.codCarrera,
  }, null, 2));

  const expectedPassword = calcularPasswordEsperado(elector.apellido, elector.ci);
  console.log(`\nContraseña esperada: ${expectedPassword}`);

  const activas = await eleccionRepo.find({ where: { estaActiva: true }, order: { fecha: 'DESC' } });
  console.log(`\nElecciones activas (${activas.length}):`);
  for (const e of activas) {
    console.log(`- ${e.titulo} | id=${e.id} | fecha=${e.fecha} | estado=${e.estado}`);
  }

  for (const eleccion of activas) {
    const entrada = await padronRepo.findOne({
      where: { eleccion: { id: eleccion.id }, elector: { id: elector.id } },
    });
    console.log(`\nPadron en "${eleccion.titulo}": ${entrada ? `habilitado=${entrada.estaHabilitado}, rector=${entrada.habilitadoRector}` : 'NO INSCRITO'}`);
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
