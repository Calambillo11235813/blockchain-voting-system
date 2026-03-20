import { Controller, Body, HttpCode, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { IOptionMemberTenant } from '../interface/option-tenant.interface';
import { Request } from 'express';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';

@Controller('tenant')
export class TenantController {
    constructor(
        private readonly tenantService: TenantService,
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthSaasGuard)
    async getAllTenants(
        @Req() req: Request,
        @Body() option: IOptionMemberTenant
    ) {
        const userId = req.userId;
        return await this.tenantService.getAllTenants({
            ...option,
            userId,
            includeTokens: true,
        });
    }
}
