import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Frente } from '../../src/elecciones/entities/frente.entity';
import { Candidato } from '../../src/elecciones/entities/candidato.entity';
import { Eleccion } from '../../src/elecciones/entities/eleccion.entity';
import { In } from 'typeorm';
import {
  ELECCION_ID,
  FRENTES_DATA,
  FRENTE_FA,
  FRENTE_JI,
  FRENTE_RE,
  PAPELETA_DECANATO,
  PAPELETA_DIRECTOR,
  PAPELETA_RECTORADO,
} from './electoral-fixtures';

const CANDIDATOS_DATA = [
  // ── Rectorado: 1 Rector + 1 Vicerrector por frente ──────────────────────
  { id: '11111111-1111-1111-1111-000000000010', ci: '7812456', nombre: 'Javier', apellido: 'Ramirez Suarez', frenteId: FRENTE_RE, papeletaId: PAPELETA_RECTORADO, cargo: 'Rector', imagenPath: '/images/RECTORES/javier_ramirez.png' },
  { id: '11111111-1111-1111-1111-000000000011', ci: '1145892', nombre: 'Claudia', apellido: 'Rios Montaño', frenteId: FRENTE_RE, papeletaId: PAPELETA_RECTORADO, cargo: 'Vicerrector', imagenPath: '/images/RECTORES/claudia_rios.png' },
  { id: '11111111-1111-1111-1111-000000000012', ci: '5629348', nombre: 'Diego', apellido: 'Hernandez Vargas', frenteId: FRENTE_FA, papeletaId: PAPELETA_RECTORADO, cargo: 'Rector', imagenPath: '/images/RECTORES/diego_hernandez.png' },
  { id: '11111111-1111-1111-1111-000000000013', ci: '1023456', nombre: 'Paola', apellido: 'Mendez Cabrera', frenteId: FRENTE_FA, papeletaId: PAPELETA_RECTORADO, cargo: 'Vicerrector', imagenPath: '/images/RECTORES/paola_mendez.png' },
  { id: '11111111-1111-1111-1111-000000000014', ci: '8945123', nombre: 'Martin', apellido: 'Herrera Quiroga', frenteId: FRENTE_JI, papeletaId: PAPELETA_RECTORADO, cargo: 'Rector', imagenPath: '/images/RECTORES/martin_herrera.png' },
  { id: '11111111-1111-1111-1111-000000000002', ci: '8124596', nombre: 'Gabriela', apellido: 'Flores Pinto', frenteId: FRENTE_JI, papeletaId: PAPELETA_RECTORADO, cargo: 'Vicerrector', imagenPath: '/images/RECTORES/gabriela_flores.png' },

  // ── Decanato: 1 Decano + 1 Vicedecano por frente ────────────────────────
  { id: '11111111-1111-1111-1111-000000000015', ci: '9234567', nombre: 'Fernanda', apellido: 'Aguilera Mendoza', frenteId: FRENTE_RE, papeletaId: PAPELETA_DECANATO, cargo: 'Decano', imagenPath: '/images/DECANOS/fernanda_aguilera.png' },
  { id: '11111111-1111-1111-1111-000000000001', ci: '3456789', nombre: 'Luis Alberto', apellido: 'Salinas Rodriguez', frenteId: FRENTE_RE, papeletaId: PAPELETA_DECANATO, cargo: 'Vicedecano', imagenPath: '/images/DECANOS/luis_salinas.png' },
  { id: '11111111-1111-1111-1111-000000000005', ci: '4567891', nombre: 'Alejandro', apellido: 'Gutierrez Molina', frenteId: FRENTE_FA, papeletaId: PAPELETA_DECANATO, cargo: 'Decano', imagenPath: '/images/DECANOS/alejandro_gutierrez.png' },
  { id: '11111111-1111-1111-1111-000000000006', ci: '7451289', nombre: 'Natalia', apellido: 'Vargas Cespedes', frenteId: FRENTE_FA, papeletaId: PAPELETA_DECANATO, cargo: 'Vicedecano', imagenPath: '/images/DECANOS/natalia_vargas.png' },
  { id: '11111111-1111-1111-1111-000000000004', ci: '5214789', nombre: 'Mariana', apellido: 'Suárez Villarroel', frenteId: FRENTE_JI, papeletaId: PAPELETA_DECANATO, cargo: 'Decano', imagenPath: '/images/DECANOS/mariana_suarez.png' },
  { id: '11111111-1111-1111-1111-000000000003', ci: '8912345', nombre: 'Mauricio', apellido: 'Castro León', frenteId: FRENTE_JI, papeletaId: PAPELETA_DECANATO, cargo: 'Vicedecano', imagenPath: '/images/DECANOS/mauricio_castro.png' },

  // ── Director de Carrera: 1 por frente ───────────────────────────────────
  { id: '11111111-1111-1111-1111-000000000007', ci: '6348921', nombre: 'Sofia', apellido: 'Delgado Arancibia', frenteId: FRENTE_RE, papeletaId: PAPELETA_DIRECTOR, cargo: 'Director de Carrera', imagenPath: '/images/DIRECTORES DE CARRERA/sofia_delgado.png' },
  { id: '11111111-1111-1111-1111-000000000008', ci: '5678912', nombre: 'Ricardo', apellido: 'Paredes Guzman', frenteId: FRENTE_FA, papeletaId: PAPELETA_DIRECTOR, cargo: 'Director de Carrera', imagenPath: '/images/DIRECTORES DE CARRERA/ricardo_paredes.png' },
  { id: '11111111-1111-1111-1111-000000000009', ci: '6789123', nombre: 'Esteban', apellido: 'Morales Aguilar', frenteId: FRENTE_JI, papeletaId: PAPELETA_DIRECTOR, cargo: 'Director de Carrera', imagenPath: '/images/DIRECTORES DE CARRERA/esteban_morales.png' },
];

async function bootstrap() {
  console.log('🌱 Iniciando Sembrado de Frentes y Candidatos...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const startTime = Date.now();

    let eleccion = await queryRunner.manager.findOne(Eleccion, { where: { id: ELECCION_ID } });
    if (!eleccion) {
      eleccion = await queryRunner.manager.findOne(Eleccion, { where: { estaActiva: true } });
    }

    if (!eleccion) {
      throw new Error(
        'No se encontró la elección de prueba. Ejecute primero seed-eleccion-papeletas.ts',
      );
    }

    console.log(`📌 Elección detectada: ${eleccion.titulo} (${eleccion.id})`);

    const papeletaIds = [PAPELETA_RECTORADO, PAPELETA_DECANATO, PAPELETA_DIRECTOR];

    console.log('🗑️ Eliminando Candidatos y Frentes anteriores de esta elección...');
    await queryRunner.manager.delete(Candidato, {
      eleccionCargo: { id: In(papeletaIds) },
    });
    await queryRunner.manager.delete(Frente, { eleccion: { id: eleccion.id } });

    const frentesParaGuardar = FRENTES_DATA.map((fData) =>
      queryRunner.manager.create(Frente, {
        id: fData.id,
        nombreFrente: fData.nombreFrente,
        sigla: fData.sigla,
        logoUrl: fData.logoUrl,
        eleccion: { id: eleccion.id },
      }),
    );

    console.log('⏳ Guardando 3 Frentes...');
    await queryRunner.manager.save(frentesParaGuardar);

    const candidatosParaGuardar = CANDIDATOS_DATA.map((cData) =>
      queryRunner.manager.create(Candidato, {
        id: cData.id,
        ci: cData.ci,
        nombres: cData.nombre,
        apellidos: cData.apellido,
        fotoUrl: cData.imagenPath,
        rolEspecifico: cData.cargo,
        frente: { id: cData.frenteId },
        eleccionCargo: { id: cData.papeletaId },
      }),
    );

    console.log(`⏳ Guardando ${CANDIDATOS_DATA.length} Candidatos...`);
    await queryRunner.manager.save(candidatosParaGuardar);

    await queryRunner.commitTransaction();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ¡Sembrado completado exitosamente en ${duration} segundos!`);
  } catch (error) {
    console.error('❌ Error sembrando datos. Haciendo ROLLBACK...');
    console.error(error);
    await queryRunner.rollbackTransaction();
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
