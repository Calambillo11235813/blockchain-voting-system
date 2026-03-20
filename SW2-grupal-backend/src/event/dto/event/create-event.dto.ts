import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEventDto {
    @IsNotEmpty()
    @IsUUID()
    facultyId: string;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsDateString()
    start_date: Date;

    @IsNotEmpty()
    @IsDateString()
    end_date: Date;

    @IsNotEmpty()
    @IsString()
    address: string;
}