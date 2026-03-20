import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { EventService } from '../services/event.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('public/event')
export class PublicEventController {
    constructor(
        private readonly eventService: EventService,
    ) { }

    @Get()
    findPublicEvents(
        @Query() paginationDto: PaginationDto & {
            startDate?: string;
            endDate?: string;
            facultyId?: string;
        }
    ) {
        return this.eventService.findPublicEvents(paginationDto);
    }

    @Get(':id')
    findPublicOne(
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.eventService.findPublicOne(id);
    }
}