import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CORS } from './constant/cors';
import { json } from 'express';
// import * as fs from 'fs';
// import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function bootstrap() {
  // const SSL_CRT_PATH = process.env.SSL_CRT_PATH;

  const app = await NestFactory.create(AppModule);

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

  app.use(
    json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl.includes('/webhooks/stripe')) {
          req.rawBody = buf;
        }
      },
      limit: '10mb',
    })
  );

  app.enableCors(CORS);
  await app.listen(port, () => {
    console.log(`Server on port ${port}`)
  });
}
bootstrap();
