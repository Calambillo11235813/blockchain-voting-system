import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Section } from './entities/section.entity';
import { Faculty } from './entities/faculty.entity';
import { EventService } from './services/event.service';
import { EventController } from './controllers/event.controller';
// import { SectionService } from './services/section.service';
import { UserModule } from '../estudiantes/usuarios/user.module';
import { FacultyService } from './services/faculty.service';
import { FacultyController } from './controllers/faculty.controller';
import { SectionController } from './controllers/section.controller';
import { SectionService } from './services/section.service';
import { TicketController } from './controllers/ticket.controller';
import { TicketService } from './services/ticket.service';
import { Ticket } from './entities/ticket.entity';
import { PublicEventController } from './controllers/public-event.controller';
import { HttpModule } from '@nestjs/axios';
import { BlockchainModule } from 'src/blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Section,
      Faculty,
      Ticket
    ]),
    UserModule,
    HttpModule,
    BlockchainModule
  ],
  controllers: [
    EventController,
    FacultyController,
    SectionController,
    TicketController,
    PublicEventController
  ],
  providers: [
    EventService,
    FacultyService,
    SectionService,
    TicketService,
  ],
  exports: [
    EventService,
  ]
})
export class EleccionesModule { }