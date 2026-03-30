import { User } from 'src/auth/entities/user.entity';

export interface CreateUserResponse {
    user: Omit<User, 'password' | 'identityVerifications' | 'role'>;
}