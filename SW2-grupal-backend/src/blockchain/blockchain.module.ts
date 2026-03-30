import { Module } from '@nestjs/common';
import { TicketValidatorContractService } from './services/ticket-validator-contract.service';
import { HttpModule } from '@nestjs/axios';
import { TicketValidatorContractController } from './controllers/ticket-validator-contract.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [TicketValidatorContractController],
  providers: [TicketValidatorContractService],
  imports: [
    HttpModule,
    AuthModule,
  ],
  exports: [TicketValidatorContractService],
})
export class BlockchainModule { }
