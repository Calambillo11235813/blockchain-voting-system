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
    ParseUUIDPipe
} from '@nestjs/common';
import { Request } from 'express';
import { FacultyService } from '../services/faculty.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { AuthSaasGuard } from 'src/auth/guards/auth-saas.guard';
import { CreateFacultyDto } from '../dto/faculty/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/faculty/update-faculty.dto';

@Controller('faculty')
@UseGuards(AuthTenantGuard, AuthSaasGuard)
export class FacultyController {
    constructor(private readonly facultyService: FacultyService) { }

    @Get()
    findAll(
        @Req() req: Request,
        @Query() paginationDto: PaginationDto
    ) {
        return this.facultyService.findAll(req.userId, req.memberTenantId, paginationDto);
    }

    @Get(':id')
    findOne(
        @Req() req: Request,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.facultyService.findOne(id, req.userId, req.memberTenantId);
    }

    @Post()
    create(
        @Body() createFacultyDto: CreateFacultyDto,
        @Req() req: Request
    ) {
        return this.facultyService.create(createFacultyDto, req.userId, req.memberTenantId);
    }

    @Patch(':id')
    patch(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateFacultyDto: UpdateFacultyDto,
        @Req() req: Request
    ) {
        return this.facultyService.patch(id, updateFacultyDto, req.userId, req.memberTenantId);
    }

    @Delete(':id')
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request
    ) {
        return this.facultyService.remove(id, req.userId, req.memberTenantId);
    }

    @Get('statistics/tenant')
    getFacultyStatistics(@Req() req: Request) {
        return this.facultyService.getFacultyStatistics(req.userId, req.memberTenantId);
    }
}