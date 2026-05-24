import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { JwtPayload } from 'src/autenticacion/interfaces/jwt-payload.interface';
import { Elector } from 'src/electores/entities/elector.entity';
import { Administrador } from 'src/administradores/entities/administrador.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,
    @InjectRepository(Administrador)
    private readonly administradorRepository: Repository<Administrador>,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('secret_key_jwt') || configService.get<string>('SECRET_KEY_JWT'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<Elector | Administrador> {
    // Reconocer todos los roles administrativos: ADMIN (legado), SISTEMAS y ELECTORAL
    const esAdministrador = payload.role === 'ADMIN' || payload.role === 'SISTEMAS' || payload.role === 'ELECTORAL';

    if (esAdministrador) {
      const administrador = await this.administradorRepository.findOne({
        where: { id: payload.sub },
      });

      if (!administrador) {
        throw new UnauthorizedException('token not valid');
      }

      return administrador;
    }

    const elector = await this.electorRepository.findOne({
      where: { id: payload.sub },
    });

    if (!elector) {
      throw new UnauthorizedException('token not valid');
    }

    // Nota: La validación de habilitado por comicio (RF1) se hace al hacer login,
    // pero a nivel de identidad global, el elector existe.
    // Si hubiese una columna global 'estaHabilitado' en Elector se chequearía aquí.
    
    return elector;
  }
}
