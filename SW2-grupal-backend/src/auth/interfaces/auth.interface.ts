import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { User } from '../entities/user.entity';

//? GLOBAL
export interface AuthResponse {
    user: Omit<User, 'password'>;
    token: string;
    memberRole?: MemberTenant;
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
export interface IUseTokenService {
    // role: string;
    memberTenantId: string;
    isExpired: boolean
}

export interface PayloadTokenTenant {
    userId: string;
}

// export interface AuthTokenResultService {
//     role?: string;
//     userId: string;
//     iat: number;
//     exp: number;
// }

export interface AuthTokenTenantResult {
    memberTenantId: string;
    iat: number;
    exp: number;
}