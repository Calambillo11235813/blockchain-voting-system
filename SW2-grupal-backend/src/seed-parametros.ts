import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfiguracionService } from './elecciones/services/configuracion.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfiguracionService);

  console.log('Cargando parametros del sistema en la BD...');

  await configService.actualizarParametro(
    'BYPASS_ELECTION_TIME', 
    'false', 
    'sistema-default', 
    'Desactiva el reloj electoral. Permite emitir votos sin importar la hora o la letra del apellido.'
  );

  await configService.actualizarParametro(
    'BYPASS_BIOMETRIA_FACE_MATCH', 
    'false', 
    'sistema-default', 
    'Al activar este parámetro, el sistema ignorará la verificación de coincidencia facial al momento de votar.'
  );

  await configService.actualizarParametro(
    'BYPASS_BIOMETRIA_OCR', 
    'false', 
    'sistema-default', 
    'Al activar este parámetro, el sistema ignorará la validación de texto (OCR) del carnet para facilitar pruebas.'
  );

  await configService.actualizarParametro(
    'GEMINI_MODEL', 
    'gemini-2.5-flash', 
    'sistema-default', 
    'Versión exacta del modelo de inteligencia artificial de Google a utilizar (ej. gemini-2.5-flash).'
  );

  await configService.actualizarParametro(
    'NODOS_RPC_URLS', 
    'https://eth-sepolia.g.alchemy.com/v2/fc-Z_Vb5SV-1RM9zCJNOq', 
    'sistema-default', 
    'URLs de los nodos de la red separadas por coma para el monitoreo de salud del sistema.'
  );

  await configService.actualizarParametro(
    'VOTACION_CONTRACT_ADDRESS', 
    '0x67a21f27d04b5615AdACB752B461D017C1198dC9', 
    'sistema-default', 
    'Dirección en la blockchain del contrato inteligente actualmente en uso para registrar votos.'
  );

  console.log('✅ Parametros cargados exitosamente.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
