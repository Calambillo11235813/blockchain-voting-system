import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envConfig } from './config/env/env.config';
import { envSchema } from './config/env/env.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './autenticacion/auth.module';
import { EleccionesModule } from './elecciones/elecciones.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { SeedModule } from './seed/seed.module';
import { UserModule } from './estudiantes/usuarios/user.module';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AdminsModule } from './administradores/admins.module';
import { BiometriaModule } from './biometria/biometria.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbSsl = configService.get<boolean>('db_ssl');
        const dbSslCaPath = configService.get<string>('db_ssl_ca_path') || process.env.DB_SSL_CA_PATH;

        return {
          type: 'postgres',
          host: configService.get<string>('db_host'),
          port: configService.get<number>('db_port'),
          username: configService.get<string>('db_user'),
          password: configService.get<string>('db_password'),
          database: configService.get<string>('db_name'),
          ssl: dbSsl
            ? {
              ca: readFileSync(dbSslCaPath || join(__dirname, '..', './ssl/ca-certificate.crt')),
              rejectUnauthorized: false,
            }
            : undefined,
          autoLoadEntities: true,
          synchronize: true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
      inject: [ConfigService]
    }),
    AuthModule,
    EleccionesModule,
    EstudiantesModule,
    BlockchainModule,
    SeedModule,
    UserModule,
    AdminsModule,
    BiometriaModule,
  ],
  // providers: [
  //   LogsService,
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: LogsInterceptor,
  //   },
  // ],
})
export class AppModule { }





