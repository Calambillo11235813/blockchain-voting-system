import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { getRepository } from 'typeorm';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request['tenantId'];

        if (tenantId) {
            const metadata = getRepository(request.route.path).metadata;
            if (metadata.columns.some(column => column.propertyName === 'tenantId')) {
                request.query = { ...request.query, tenantId };
            }
        }

        return next.handle();
    }
}