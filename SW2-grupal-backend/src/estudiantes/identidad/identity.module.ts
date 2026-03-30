import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/estudiantes/usuarios/user.module';
import { IdentityVerification } from './entities/identity-verification.entity';
import { IdentityVerificationController } from './controllers/identity.controller';
import { IdentityVerificationService } from './services/identity.service';
import { Event } from 'src/elecciones/entities/event.entity';

@Module({
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService],
  imports: [
    TypeOrmModule.forFeature([
      IdentityVerification,
      Event
    ]),
    AuthModule,
    UserModule
  ]
})
export class IdentityModule { }

