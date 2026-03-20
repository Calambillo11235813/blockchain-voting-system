import { PartialType } from '@nestjs/mapped-types';
import { CreateSectionDto } from './create-section.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSectionDto extends PartialType(CreateSectionDto) {
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}