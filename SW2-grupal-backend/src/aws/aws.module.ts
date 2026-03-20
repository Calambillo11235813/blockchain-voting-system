import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { AwsController } from './controllers/aws.controller';
import { AwsService } from './services/aws.service';

import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    TenantModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [AwsController],
  providers: [AwsService],
  exports: [AwsService],
})
export class AwsModule { }