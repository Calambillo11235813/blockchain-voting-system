import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Purchase } from './entities/purchase.entity';
import { TicketPurchase } from './entities/ticket-purchase.entity';
import { StripeService } from './services/stripe.service';
import { Ticket } from 'src/event/entities/ticket.entity';
import { Section } from 'src/event/entities/section.entity';
import { AuthModule } from 'src/auth/auth.module';
import { PurchaseService } from './services/purchase.service';
import { TenantModule } from 'src/tenant/tenant.module';
import { PurchaseController } from './controllers/purcharse.controller';
import { ConfigModule } from '@nestjs/config';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';

@Module({
  controllers: [PaymentController, PurchaseController, StripeWebhookController],
  providers: [PaymentService, StripeService, PurchaseService],
  imports: [
    AuthModule,
    TenantModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      Payment,
      Purchase,
      TicketPurchase,
      Ticket,
      Section
    ]),
  ],
})
export class PaymentModule { }


