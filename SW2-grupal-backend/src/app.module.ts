import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envConfig } from './config/env/env.config';
import { envSchema } from './config/env/env.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { EventModule } from './event/event.module';
import { IdentityModule } from './identity/identity.module';
import { TenantModule } from './tenant/tenant.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { PaymentModule } from './payment/payment.module';
import { SeedModule } from './seed/seed.module';
import { UserModule } from './user/user.module';
import { AuditModule } from './audit/audit.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CommonModule } from './common/common.module';
import { AwsModule } from './aws/aws.module';
import { readFileSync } from 'fs';
// import { join } from 'path';
import { ChatbotModule } from './chatbot/chatbot.module';
import { join } from 'path';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('db_host'),
        port: configService.get<number>('db_port'),
        username: configService.get<string>('db_user'),
        password: configService.get<string>('db_password'),
        database: configService.get<string>('db_name'),
        //  local + ip
        // ssl: {
        //   ca: readFileSync(join(__dirname, '..', './ssl/ca-certificate.crt')),
        //   rejectUnauthorized: true,
        // },
        // local 2
        ssl: {
          ca: readFileSync(process.env.DB_SSL_CA_PATH || join(__dirname, '..', './ssl/ca-certificate.crt')),
          rejectUnauthorized: false,
        },
        // ssl: {
        //   ca: readFileSync(process.env.DB_SSL_CA_PATH || '/app/ssl/ca-certificate.crt'),
        //   rejectUnauthorized: true,
        // },
        autoLoadEntities: true,
        synchronize: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
      inject: [ConfigService]
    }),
    AuthModule,
    EventModule,
    IdentityModule,
    TenantModule,
    BlockchainModule,
    PaymentModule,
    SeedModule,
    UserModule,
    AuditModule,
    CloudinaryModule,
    CommonModule,
    AwsModule,
    ChatbotModule
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




