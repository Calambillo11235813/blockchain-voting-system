export type RolUsuario = 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO' | 'ADMIN';

export interface JwtPayload {
    sub: string;
    role: RolUsuario;
    registro?: string;
    correo?: string;
    iat?: number;
    exp?: number;
}