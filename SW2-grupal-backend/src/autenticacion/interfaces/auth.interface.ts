export interface AuthResponse {
    token: string;
}

// Legacy (plantilla SaaS) - recomendado eliminar cuando se retire AuthSaasGuard.
export interface IUseToken {
    userId: string;
    isExpired: boolean
}

export interface AuthTokenResult {
    userId: string;
    iat: number;
    exp: number;
}
