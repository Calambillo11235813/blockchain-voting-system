import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateTicketDto {
    @IsNotEmpty()
    @IsUUID()
    sectionId: string;

    @IsOptional()
    @IsDateString()
    date?: Date;
}