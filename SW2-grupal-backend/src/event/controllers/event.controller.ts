import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request } from 'express';
import { EventService } from '../services/event.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { CreateEventDto } from '../dto/event/create-event.dto';
import { UpdateEventDto } from '../dto/event/update-event.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FacultyExistsPipe } from 'src/common/pipes/entity-exists.pipe';
import { Faculty } from '../entities/faculty.entity';
import { IOptionPipe } from '../pipe/option.pipe';

@Controller('event')
@UseGuards(AuthTenantGuard, AuthSaasGuard)
export class EventController {
  constructor(
    private readonly eventService: EventService,
  ) {
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto
  ) {
    return this.eventService.findAll(req.userId, req.memberTenantId, paginationDto);
  }

  @Get(':id')
  findOne(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.eventService.findOne(id, req.userId, req.memberTenantId);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image_event', maxCount: 1 },
    { name: 'image_section', maxCount: 1 },
  ]))
  create(
    @Body() createEventDto: CreateEventDto,
    @Body('facultyId', FacultyExistsPipe) facultyResult: IOptionPipe<Faculty>,
    @Req() req: Request,
    @UploadedFiles() files: {
      image_event: Express.Multer.File[],
      image_section?: Express.Multer.File[]
    },
  ) {
    return this.eventService.create({ ...createEventDto, faculty: facultyResult.entity }, files, req.userId, req.memberTenantId);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image_event', maxCount: 1 },
    { name: 'image_section', maxCount: 1 },
  ]))
  patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Req() req: Request,
    @UploadedFiles() files: {
      image_event?: Express.Multer.File[],
      image_section?: Express.Multer.File[]
    },
  ) {
    return this.eventService.patch(id, updateEventDto, files, req.userId, req.memberTenantId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ) {
    return this.eventService.remove(id, req.userId, req.memberTenantId);
  }

  @Get('faculty/:facultyId')
  findByFaculty(
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
    @Req() req: Request,
    @Query() paginationDto: PaginationDto
  ) {
    return this.eventService.findByFaculty(facultyId, req.userId, req.memberTenantId, paginationDto);
  }

  @Get('statistics/tenant')
  getEventStatistics(@Req() req: Request) {
    return this.eventService.getEventStatistics(req.userId, req.memberTenantId);
  }

}