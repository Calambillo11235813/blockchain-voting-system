import { DataSource } from 'typeorm';

/**
 * Script independiente para limpiar datos de prueba.
 * No depende de NestJS/AppModule, se conecta directamente a PostgreSQL.
 * 
 * Uso en Docker:
 *   docker exec -it voting_backend npx ts-node scripts/limpiar-datos-prueba.ts
 */
async function limpiar() {
  console.log('🧹 Iniciando limpieza de datos de prueba...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'nicolas123',
    database: process.env.DB_NAME || 'Votaciones_Blockchain',
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Borrar datos que dependen de otras tablas primero (Hijos)
    console.log('  Borrando Votos / Padron Electoral...');
    await queryRunner.query('DELETE FROM padron_electoral');

    console.log('  Borrando Candidatos...');
    await queryRunner.query('DELETE FROM candidato');

    console.log('  Borrando Frentes...');
    await queryRunner.query('DELETE FROM frente');

    console.log('  Borrando Cargos (Papeletas)...');
    await queryRunner.query('DELETE FROM eleccion_cargo');

    // 2. Borrar las tablas principales (Padres)
    console.log('  Borrando Electores...');
    await queryRunner.query('DELETE FROM electores');

    console.log('  Borrando Elecciones...');
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
    await dataSource.destroy();
  }
}

limpiar();
