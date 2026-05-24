import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guardia de autenticación para endpoints protegidos con JWT.
 * Verifica la firma del token y coloca al Elector validado en req.user.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
