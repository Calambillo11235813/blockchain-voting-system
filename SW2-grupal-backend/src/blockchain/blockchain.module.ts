import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { Configuration } from 'src/tenant/entities/configuration.entity';
import { TicketValidatorContractService } from './services/ticket-validator-contract.service';
import { HttpModule } from '@nestjs/axios';
import { TicketValidatorContractController } from './controllers/ticket-validator-contract.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthTenantGuard } from '../auth/guards/auth-tenant.guard';
import { TenantService } from 'src/user/services/tenant.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [TicketValidatorContractController],
  providers: [TicketValidatorContractService, AuthTenantGuard, TenantService],
  imports: [
    TypeOrmModule.forFeature([
      MemberTenant,
      Configuration,
    ]),
    HttpModule,
    AuthModule,
    forwardRef(() => TenantModule),
  ],
  exports: [TicketValidatorContractService],
})
export class BlockchainModule { }
