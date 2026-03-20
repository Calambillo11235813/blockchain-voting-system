import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User } from 'src/auth/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      MemberTenant
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('secret_key_jwt'),
        signOptions: {
          expiresIn: '24h',
        }
      })
    }),
    NestjsFormDataModule
  ],
  controllers: [
    UserController,
    TenantController
  ],
  providers: [
    UserService,
    TenantService
  ],
  exports: [
    UserService,
    TenantService
  ]
})
export class UserModule { }
