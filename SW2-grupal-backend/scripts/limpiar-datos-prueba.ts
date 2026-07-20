import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  console.log('🧹 Iniciando limpieza de datos de prueba...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Borrar datos que dependen de otras tablas primero (Hijos)
    console.log('Borrando Votos / Padron Electoral...');
    await queryRunner.query('DELETE FROM padron_electoral');
    
    console.log('Borrando Candidatos...');
    await queryRunner.query('DELETE FROM candidato');
    
    console.log('Borrando Frentes...');
    await queryRunner.query('DELETE FROM frente');
    
    console.log('Borrando Cargos (Papeletas)...');
    await queryRunner.query('DELETE FROM eleccion_cargo');
    
    // 2. Borrar las tablas principales (Padres)
    console.log('Borrando Electores...');
    await queryRunner.query('DELETE FROM elector');
    
    console.log('Borrando Elecciones...');
    await queryRunner.query('DELETE FROM eleccion');
    
    await queryRunner.commitTransaction();
    console.log('✅ Base de datos limpiada exitosamente. Lista para nuevas pruebas.');
  } catch (error) {
    console.error('❌ Error limpiando datos. Haciendo ROLLBACK...');
    console.error(error);
    await queryRunner.rollbackTransaction();
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
