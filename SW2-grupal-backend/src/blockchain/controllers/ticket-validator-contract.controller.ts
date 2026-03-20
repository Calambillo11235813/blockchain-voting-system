import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Query,
    Req,
    ParseUUIDPipe
} from '@nestjs/common';
import { Request } from 'express';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { TicketValidatorContractService } from '../services/ticket-validator-contract.service';

@Controller('blockchain')
@UseGuards(AuthTenantGuard, AuthSaasGuard)
export class TicketValidatorContractController {
    constructor(
        private readonly ticketValidatorContractService: TicketValidatorContractService,
    ) { }

    // @Post('tenant/:tenantId/deploy-ticket-validator')
    // async deployTicketValidatorForMember(
    //     @Param('tenantId', ParseUUIDPipe) tenantId: string,
    //     @Req() req: Request,
    // ) {
    //     const memberTenant = await this.ticketValidatorContractService.deployTicketValidatorContract(req.userId, tenantId);
    //     return {
    //         memberTenant,
    //         message: 'Contrato TicketValidator desplegado y asociado al tenant exitosamente',
    //     };
    // }

    @Post('validate-ticket')
    async registerTicketValidation(
        @Req() req: Request,
        @Body() validationData: {
            ticketId: string;
            purchaseId: string;
            eventId: string;
            sectionName?: string;
        },
    ) {
        const result = await this.ticketValidatorContractService.registerTicketValidation(
            req.memberTenantId,
            validationData.ticketId,
            validationData.purchaseId,
            req.userId,
            validationData.eventId,
            validationData.sectionName || '',
        );

        return {
            ...result,
            message: 'Ticket validado exitosamente en blockchain',
        };
    }

    @Get('verify-ticket/:ticketId')
    async verifyTicket(
        @Req() req: Request,
        @Param('ticketId', ParseUUIDPipe) ticketId: string,
    ) {
        const result = await this.ticketValidatorContractService.verifyTicket(req.memberTenantId, ticketId);
        return result;
    }

    @Get('verify-hash/:validationHash')
    async verifyValidationHash(
        @Req() req: Request,
        @Param('validationHash') validationHash: string,
    ) {
        const result = await this.ticketValidatorContractService.verifyValidationHash(req.memberTenantId, validationHash);
        return result;
    }

    @Get('tenant-stats')
    async getTenantStats(@Req() req: Request) {
        const result = await this.ticketValidatorContractService.getTenantStats(req.memberTenantId);
        return result;
    }

    @Get('event-stats')
    async getEventStats(
        @Req() req: Request,
        @Query('eventId') eventId: string,
    ) {
        const result = await this.ticketValidatorContractService.getEventStats(req.memberTenantId, eventId);
        return result;
    }

    @Get('validator-stats')
    async getValidatorStats(
        @Req() req: Request,
        @Query('validatorId') validatorId: string,
    ) {
        const result = await this.ticketValidatorContractService.getValidatorStats(req.memberTenantId, validatorId);
        return result;
    }
}