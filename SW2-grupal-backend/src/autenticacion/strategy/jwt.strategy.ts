import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { JwtPayload } from 'src/autenticacion/interfaces/jwt-payload.interface';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('secret_key_jwt') || configService.get<string>('SECRET_KEY_JWT'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<Estudiante> {
    const estudiante = await this.estudianteRepository.findOne({
      where: { id: payload.sub },
    });

    if (!estudiante) {
      throw new UnauthorizedException('token not valid');
    }

    if (!estudiante.estaHabilitado) {
      throw new UnauthorizedException('estudiante no habilitado');
    }

    return estudiante;
  }
}
