import { PartialType } from '@nestjs/mapped-types';
import { CreateFacultyDto } from './create-faculty.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFacultyDto extends PartialType(CreateFacultyDto) {
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}