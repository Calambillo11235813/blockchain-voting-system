// --- POLIFILL PARA TENSORFLOW & FACE-API EN NODE.JS ---
// FaceAPI (por debajo usa tfjs-core) hace crash si no encuentra TextEncoder globalmente evaluado al momento de su importación.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(globalThis, { TextEncoder, TextDecoder });
// --------------------------------------------------------

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CORS } from './compartido/cors';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
// import * as fs from 'fs';
// import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function bootstrap() {
  // const SSL_CRT_PATH = process.env.SSL_CRT_PATH;

  // Importante:
  // - NestJS registra body-parser por defecto.
  // - Para aceptar imágenes en base64 (JSON grandes) necesitamos controlar el límite.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // if (SSL_CRT_PATH) {
  //   try {
  //     const httpsOptions: HttpsOptions = {
  //       cert: fs.readFileSync(SSL_CRT_PATH).toString(),
  //     };
  //     app = await NestFactory.create(AppModule, { httpsOptions });
  //     console.log('Certificados CRT cargados correctamente - usando PG de DIGITAL OCEAN');
  //   } catch (error) {
  //     console.error('Error al cargar certificados SSL:', error.message);
  //     app = await NestFactory.create(AppModule);
  //     console.log('Iniciando en modo HTTP');
  //   }
  // } else {
  //   app = await NestFactory.create(AppModule);
  //   console.log('Iniciando en modo HTTP (no se proporcionaron certificados SSL)');
  // }

  const port = process.env.PORT;
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  app.useStaticAssets(join(process.cwd(), 'public'));

  app.enableCors(CORS);
  await app.listen(port, () => {
    console.log(`Server on port ${port}`)
  });
}
bootstrap();
