import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AdminsModule } from 'src/administradores/admins.module';
import { EleccionesModule } from 'src/elecciones/elecciones.module';
import { ElectoresModule } from 'src/electores/electores.module';
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    AdminsModule,
    EleccionesModule,
    ElectoresModule,
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
  exports: []
})
export class AuthModule { }
