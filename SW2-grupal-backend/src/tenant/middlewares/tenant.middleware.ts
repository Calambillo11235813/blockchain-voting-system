import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private tenantService: TenantService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const tenantId = req.headers['x-tenant-id'] as string;
        if (tenantId) {
            // const tenant = await this.tenantService.findById(tenantId);
            // if (tenant && tenant.active) {
            //     req['tenantId'] = tenantId;
            // }
        }
        next();
    }
}

