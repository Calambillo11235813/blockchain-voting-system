export type RolUsuario = 'ESTUDIANTE' | 'ADMIN';

export interface JwtPayload {
    sub: string;
    role: RolUsuario;
    registro?: string;
    correo?: string;
    iat?: number;
    exp?: number;
}