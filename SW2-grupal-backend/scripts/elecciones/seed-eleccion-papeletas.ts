import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Eleccion } from '../../src/elecciones/entities/eleccion.entity';
import { EleccionCargo } from '../../src/elecciones/entities/eleccion-cargo.entity';
import { Cargo } from '../../src/elecciones/entities/cargo.entity';
import { Elector } from '../../src/electores/entities/elector.entity';
import { AlcancePapeletaEnum } from '../../src/elecciones/enums/alcance-papeleta.enum';
import { EstadoEleccionEnum } from '../../src/elecciones/enums/estado-eleccion.enum';
import { PadronService } from '../../src/elecciones/services/padron.service';
import {
  CARRERA_SISTEMAS,
  ELECCION_FIXTURE,
  FACULTAD_FICCT,
  PAPELETAS_FIXTURE,
} from './electoral-fixtures';

interface CodigosAmbito {
  codFacultad: string;
  facultadNombre: string;
  codCarrera: string;
  carreraNombre: string;
}

async function resolverCodigosAmbito(dataSource: DataSource): Promise<CodigosAmbito> {
  const electorRepo = dataSource.getRepository(Elector);

  const facultad = await electorRepo
    .createQueryBuilder('e')
    .select('e.codFacultad', 'codFacultad')
    .addSelect('MAX(e.facultad)', 'facultadNombre')
    .where('e.codFacultad IS NOT NULL')
    .andWhere("TRIM(e.codFacultad) <> ''")
    .andWhere('UPPER(e.facultad) LIKE :patron', {
      patron: `%${FACULTAD_FICCT.busquedaNombre}%`,
    })
    .groupBy('e.codFacultad')
    .getRawOne<{ codFacultad: string; facultadNombre: string }>();

  if (!facultad?.codFacultad) {
    throw new Error(
      'No se encontró la facultad FICCT en el catálogo de electores. ' +
        'Cargue el padrón Excel al menos una vez antes de ejecutar este script.',
    );
  }

  const carrera = await electorRepo
    .createQueryBuilder('e')
    .select('e.codCarrera', 'codCarrera')
    .addSelect('MAX(e.carrera)', 'carreraNombre')
    .where('e.codFacultad = :codFacultad', { codFacultad: facultad.codFacultad })
    .andWhere('e.codCarrera IS NOT NULL')
    .andWhere("TRIM(e.codCarrera) <> ''")
    .andWhere('UPPER(e.carrera) LIKE :patron', {
      patron: `%${CARRERA_SISTEMAS.busquedaNombre}%`,
    })
    .groupBy('e.codCarrera')
    .getRawOne<{ codCarrera: string; carreraNombre: string }>();

  if (!carrera?.codCarrera) {
    throw new Error(
      'No se encontró la carrera Ingeniería en Sistemas en el catálogo de electores. ' +
        'Cargue el padrón Excel al menos una vez antes de ejecutar este script.',
    );
  }

  return {
    codFacultad: String(facultad.codFacultad).trim(),
    facultadNombre: String(facultad.facultadNombre ?? FACULTAD_FICCT.nombre).trim(),
    codCarrera: String(carrera.codCarrera).trim(),
    carreraNombre: String(carrera.carreraNombre ?? CARRERA_SISTEMAS.nombre).trim(),
  };
}

async function bootstrap() {
  console.log('🗳️  Iniciando seed de Elección + Papeletas...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const padronService = app.get(PadronService);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const startTime = Date.now();
    const codigos = await resolverCodigosAmbito(dataSource);

    console.log(`📍 Facultad: ${codigos.facultadNombre} (${codigos.codFacultad})`);
    console.log(`📍 Carrera: ${codigos.carreraNombre} (${codigos.codCarrera})`);

    await queryRunner.manager
      .createQueryBuilder()
      .update(Eleccion)
      .set({ estaActiva: false })
      .execute();

    const eleccion = queryRunner.manager.create(Eleccion, {
      id: ELECCION_FIXTURE.id,
      titulo: ELECCION_FIXTURE.titulo,
      gestion: ELECCION_FIXTURE.gestion,
      fecha: new Date(`${ELECCION_FIXTURE.fecha}T12:00:00`),
      restriccionAlfabeticaActiva: ELECCION_FIXTURE.restriccionAlfabeticaActiva,
      estaActiva: false,
      estado: EstadoEleccionEnum.EN_CONFIGURACION,
    });
    await queryRunner.manager.save(Eleccion, eleccion);
    console.log(`✅ Elección guardada: ${eleccion.titulo} (${eleccion.id})`);

    const papeletasResueltas = PAPELETAS_FIXTURE.map((papeleta) => {
      if (papeleta.alcance === AlcancePapeletaEnum.FACULTAD) {
        return {
          ...papeleta,
          codFacultad: codigos.codFacultad,
          facultadNombre: codigos.facultadNombre,
        };
      }

      if (papeleta.alcance === AlcancePapeletaEnum.CARRERA) {
        return {
          ...papeleta,
          codFacultad: codigos.codFacultad,
          facultadNombre: codigos.facultadNombre,
          codCarrera: codigos.codCarrera,
          carreraNombre: codigos.carreraNombre,
        };
      }

      return papeleta;
    });

    for (const papeleta of papeletasResueltas) {
      const cargo = queryRunner.manager.create(Cargo, {
        id: papeleta.cargoId,
        nombre: papeleta.nombre,
        facultad: '',
        tipoCargo: papeleta.tipoCargo,
      });
      await queryRunner.manager.save(Cargo, cargo);

      const eleccionCargo = queryRunner.manager.create(EleccionCargo, {
        id: papeleta.id,
        eleccion: { id: ELECCION_FIXTURE.id },
        cargo: { id: papeleta.cargoId },
        alcance: papeleta.alcance,
        codFacultad: papeleta.codFacultad,
        facultadNombre: papeleta.facultadNombre,
        codCarrera: papeleta.codCarrera,
        carreraNombre: papeleta.carreraNombre,
        orden: papeleta.orden,
        estaActiva: true,
      });
      await queryRunner.manager.save(EleccionCargo, eleccionCargo);

      const ambito =
        papeleta.alcance === AlcancePapeletaEnum.GLOBAL
          ? 'Universidad (todos)'
          : papeleta.alcance === AlcancePapeletaEnum.FACULTAD
            ? papeleta.facultadNombre
            : `${papeleta.facultadNombre} — ${papeleta.carreraNombre}`;

      console.log(`   📋 Papeleta: ${papeleta.nombre} | ${papeleta.alcance} | ${ambito}`);
    }

    const vinculados = await padronService.vincularPadronExistenteAEleccion(
      ELECCION_FIXTURE.id,
      queryRunner.manager,
    );

    await queryRunner.commitTransaction();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Seed completado en ${duration}s`);
    console.log(`   · Papeletas: ${papeletasResueltas.length}`);
    console.log(`   · Padrón vinculado: ${vinculados} electores`);
    console.log('\n➡️  Siguiente paso: ejecutar seed-electoral-data.ts para frentes y candidatos.');
  } catch (error) {
    console.error('❌ Error en seed. Haciendo ROLLBACK...');
    console.error(error);
    await queryRunner.rollbackTransaction();
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
