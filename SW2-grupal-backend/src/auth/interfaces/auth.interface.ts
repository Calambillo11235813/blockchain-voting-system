import { User } from '../entities/user.entity';

//? GLOBAL
export interface AuthResponse {
    user: Omit<User, 'password'>;
    token: string;
}

//?SAAS
export interface PayloadToken {
    userId: string;
}

export interface IUseToken {
    userId: string;
    isExpired: boolean
}

export interface AuthTokenResult {
    userId: string;
    iat: number;
    exp: number;
}

//?tenant
// export interface IUseTokenService {
//     role: string;
//     userId: string;
//     isExpired: boolean
// }
