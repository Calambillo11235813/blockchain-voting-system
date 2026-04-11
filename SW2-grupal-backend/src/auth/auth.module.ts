import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthSaasGuard } from './guards/auth-saas.guard';
import { UserModule } from 'src/estudiantes/usuarios/user.module';
import { EstudiantesModule } from 'src/estudiantes/estudiantes.module';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';
import { AdminsModule } from 'src/admins/admins.module';
import { EleccionesModule } from 'src/elecciones/elecciones.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthSaasGuard],
  imports: [
    EstudiantesModule,
    AdminsModule,
    EleccionesModule,
    UserModule,
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Estudiante,
      
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('secret_key_jwt'),
          signOptions: {
            expiresIn: '24h',
          },
        };
      },
    }),
  ],
  exports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Estudiante,
      
    ]),
    AuthSaasGuard,
    UserModule,
    EstudiantesModule,
  ]
})
export class AuthModule { }
