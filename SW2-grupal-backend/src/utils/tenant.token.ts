import * as jwt from 'jsonwebtoken';
import { AuthTokenTenantResult, IUseTokenService } from 'src/auth/interfaces/auth.interface';
import { handleError } from 'src/common/helpers/function-helper';

export const useTokenTenant = (token: string): IUseTokenService | string => {
    try {
        const decode = jwt.decode(token) as AuthTokenTenantResult;

        const currentDate = new Date();
        const expiresDate = new Date(decode.exp);

        return {
            memberTenantId: decode.memberTenantId,
            isExpired: +expiresDate <= +currentDate / 1000,
        };
    } catch (error) {
        throw handleError(error, {
            context: 'Utils.useTokenTenant',
            action: 'decode',
            entityName: 'Token',
            additionalInfo: {
                token,
                message: 'Token is invalid',
            }
        })
    }
};