const { DataSource } = require('typeorm');

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    username: 'postgres',
    password: 'nicolas123',
    database: 'Votaciones_Blockchain',
  });
  await ds.initialize();
  await ds.query("UPDATE parametros_sistema SET clave='BYPASS_BIOMETRIA_OCR', valor='false', descripcion='Desactiva el reconocimiento de texto (OCR) en ambos lados del carnet para facilitar pruebas.' WHERE clave='BIOMETRIA_OCR_PROVIDER'");
  console.log('Done');
  await ds.destroy();
}

run().catch(console.error);
