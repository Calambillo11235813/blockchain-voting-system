import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    ParseUUIDPipe,
    Query
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PurchaseService } from '../services/purchase.service';

@Controller('purchase')
export class PurchaseController {
    constructor(private readonly purchaseService: PurchaseService) { }

    @Get()
    @UseGuards(AuthTenantGuard, AuthSaasGuard)
    findAll(
        @Req() req: Request,
        @Query() paginationDto: PaginationDto
    ) {
        return this.purchaseService.findAll(req.userId, req.memberTenantId, paginationDto);
    }

    @Get(':id')
    @UseGuards(AuthTenantGuard, AuthSaasGuard)
    findOne(
        @Req() req: Request,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.purchaseService.findOne(id, req.userId, req.memberTenantId);
    }

    @Post('validate-ticket')
    @UseGuards(AuthSaasGuard)
    async validateClientTicket(
        @Body('ticketPurchaseId') ticketPurchaseId: string,
        @Req() req
    ) {
        return this.purchaseService.validateClientTicket(ticketPurchaseId, req.userId);
    }

    @Get('statistics/tenant')
    @UseGuards(AuthTenantGuard, AuthSaasGuard)
    getPurchaseStatistics(@Req() req: Request) {
        return this.purchaseService.getPurchaseStatistics(req.userId, req.memberTenantId);
    }

    @Post()
    @UseGuards(AuthSaasGuard)
    create(
        @Body() createPurchaseDto: CreatePurchaseDto,
        @Req() req: Request
    ) {
        return this.purchaseService.createForUser(
            createPurchaseDto,
            req.userId
        );
    }

    @Get('user/my-purchases')
    @UseGuards(AuthSaasGuard)
    getMyPurchases(
        @Req() req: Request,
        @Query() paginationDto: PaginationDto
    ) {
        return this.purchaseService.getMyPurchasesForUser(
            req.userId,
            paginationDto
        );
    }

    @Get('user/:id')
    @UseGuards(AuthSaasGuard)
    findOneForUser(
        @Req() req: Request,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.purchaseService.findOneForUser(id, req.userId);
    }

    @Get('ticket/:ticketPurchaseId/qr')
    @UseGuards(AuthSaasGuard)
    generateTicketQR(
        @Param('ticketPurchaseId', ParseUUIDPipe) ticketPurchaseId: string,
        @Req() req: Request
    ) {
        return this.purchaseService.generateTicketQR(
            ticketPurchaseId,
            req.userId
        );
    }

    // todo pendiendte
    // @Get('verify-blockchain/:transactionHash')
    // @UseGuards(AuthSaasGuard)
    // verifyBlockchainTransaction(
    //     @Param('transactionHash') transactionHash: string
    // ) {
    //     // Este endpoint permitiría a los usuarios verificar la autenticidad
    //     // de una transacción de validación en la blockchain
    //     const blockchainService = new BlockchainService(null);
    //     return blockchainService.verifyTicketOnBlockchain(transactionHash);
    // }

    // @Get('tenant/my-purchases')
    // @UseGuards(AuthTenantGuard, AuthSaasGuard)
    // getMyPurchasesAsTenant(
    //     @Req() req: Request,
    //     @Query() paginationDto: PaginationDto
    // ) {
    //     return this.purchaseService.getMyPurchases(
    //         req.userId,
    //         req.memberTenantId,
    //         paginationDto
    //     );
    // }

    // @Post('tenant')
    // @UseGuards(AuthTenantGuard, AuthSaasGuard)
    // createAsTenant(
    //     @Body() createPurchaseDto: CreatePurchaseDto,
    //     @Req() req: Request
    // ) {
    //     return this.purchaseService.create(
    //         createPurchaseDto,
    //         req.userId,
    //         req.memberTenantId
    //     );
    // }


}