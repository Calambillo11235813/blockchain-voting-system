export interface JwtPayload {
    sub: string;
    registro: string;
    role: 'ESTUDIANTE';
    iat?: number;
    exp?: number;
}