import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { Request } from 'express';
import { Stripe } from 'stripe';
import { QueryCommonDTO } from 'src/common/dto/query-common.dto';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { SubscriptionCreateDTO } from '../dto/subscription/create-subscription.dto';

@Controller('subscription')
export class SubscriptionController {

    constructor(
        private readonly subscriptionService: SubscriptionService
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async allSubscriptions(@Query() queryCommonDTO: QueryCommonDTO) {
        return this.subscriptionService.findAllSubscriptions(queryCommonDTO)
    }

    @Get(':id')
    @HttpCode(HttpStatus.ACCEPTED)
    async findSubscription(@Param('id', ParseUUIDPipe) id: string) {
        const subscription = await this.subscriptionService.findSubscriptionById(id, {
            select: {
                id: true,
                duration: true,
                price: true,
                plan_type: true,
            }
        });
        return subscription;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(AuthSaasGuard)
    async createSubscription(@Body() createdSubscription: SubscriptionCreateDTO, @Req() req: Request) {
        const userId = req.userId;
        const paymentSubscription = await this.subscriptionService.paymentSubscription({
            ...createdSubscription,
            userId
        });

        return paymentSubscription;
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async webhookPaymentStripe(@Body() body: Stripe.CheckoutSessionCompletedEvent) {
        if (body.type !== 'checkout.session.completed') return;

        const metadata = body.data.object.metadata;
        if (!metadata) {
            throw new BadRequestException("Metadata no encontrada en el evento `checkout.session.completed`");
        }

        return await this.subscriptionService.webhookPayment(body.data.object.metadata);
    }

}