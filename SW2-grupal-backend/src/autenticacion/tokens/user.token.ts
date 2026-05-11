import * as jwt from 'jsonwebtoken';
import { AuthTokenResult, IUseToken } from 'src/autenticacion/interfaces/auth.interface';
import { handleError } from 'src/compartido/manejo-errores';

export const useTokenSaas = (token: string): IUseToken | string => {
    try {
        const decode = jwt.decode(token) as AuthTokenResult;

        const currentDate = new Date();
        const expiresDate = new Date(decode.exp);

        return {
            userId: decode.userId,
            isExpired: +expiresDate <= +currentDate / 1000,
        };
    } catch (error) {
        throw handleError(error, {
            context: 'Utils.useTokenSaas',
            action: 'decode',
            entityName: 'Token',
            additionalInfo: {
                token,
                message: 'Token is invalid',
            }
        })
    }
};
