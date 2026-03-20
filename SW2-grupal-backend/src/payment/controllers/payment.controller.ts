import { Controller, Post, Get, Param, UseGuards, BadRequestException, Req, ParseUUIDPipe } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../entities/payment.entity';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { ApiResponse } from 'src/common/interfaces/response.interface';
import { Request } from 'express';

@Controller('payment')
@UseGuards(AuthSaasGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('purchase/:purchaseId')
    async createPaymentForPurchase(
        @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
        @Req() req: Request
    ): Promise<ApiResponse<Payment>> {
        if (!purchaseId) {
            throw new BadRequestException('El ID de la compra es requerido');
        }
        const userId = req.userId;
        return this.paymentService.createPaymentForPurchase(purchaseId, userId);
    }

    @Post('purchase/:purchaseId/new')
    createNewPaymentLink(
        @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
        @Req() req: Request
    ) {
        return this.paymentService.createNewPaymentLink(purchaseId, req.userId);
    }

    @Get(':paymentId/verify')
    async verifyPayment(
        @Param('paymentId') paymentId: string,
    ): Promise<ApiResponse<Payment>> {
        return this.paymentService.verifyPayment(paymentId);
    }
}