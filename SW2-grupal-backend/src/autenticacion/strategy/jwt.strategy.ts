import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { JwtPayload } from 'src/autenticacion/interfaces/jwt-payload.interface';
import { Elector } from 'src/electores/entities/elector.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('secret_key_jwt') || configService.get<string>('SECRET_KEY_JWT'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<Elector> {
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
