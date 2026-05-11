import { User } from 'src/autenticacion/entities/user.entity';

export interface CreateUserResponse {
    user: Omit<User, 'password' | 'identityVerifications' | 'role'>;
}