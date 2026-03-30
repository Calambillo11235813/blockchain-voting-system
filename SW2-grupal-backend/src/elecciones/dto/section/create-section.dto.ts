import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSectionDto {
    @IsNotEmpty()
    @IsUUID()
    eventId: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    capacity: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price: number;

}