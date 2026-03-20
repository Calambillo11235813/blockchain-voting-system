import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Section } from './entities/section.entity';
import { Faculty } from './entities/faculty.entity';
import { EventService } from './services/event.service';
import { TenantModule } from '../tenant/tenant.module';
import { EventController } from './controllers/event.controller';
// import { SectionService } from './services/section.service';
import { UserModule } from '../user/user.module';
import { FacultyService } from './services/faculty.service';
import { FacultyController } from './controllers/faculty.controller';
import { CloudinaryService } from 'src/cloudinary/services/cloudinary.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SectionController } from './controllers/section.controller';
import { SectionService } from './services/section.service';
import { TicketController } from './controllers/ticket.controller';
import { TicketService } from './services/ticket.service';
import { Ticket } from './entities/ticket.entity';
import { PublicEventController } from './controllers/public-event.controller';
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';
import { TicketValidatorContractService } from 'src/blockchain/services/ticket-validator-contract.service';
import { HttpModule } from '@nestjs/axios';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Section,
      Faculty,
      Ticket,
      TicketPurchase,
      MemberTenant
    ]),
    TenantModule,
    UserModule,
    CloudinaryModule,
    HttpModule
  ],
  controllers: [
    EventController,
    FacultyController,
    SectionController,
    TicketController,
    PublicEventController
  ],
  providers: [
    TicketValidatorContractService,
    EventService,
    FacultyService,
    SectionService,
    TicketService,
    CloudinaryService
  ],
  exports: [
    EventService,
  ]
})
export class EventModule { }