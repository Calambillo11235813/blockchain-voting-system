import { IsNotEmpty, IsString, IsNumber, IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class ValidateTicketDto {
    @IsNotEmpty()
    @IsUUID()
    purchaseId: string;

    @IsNotEmpty()
    @IsUUID()
    ticketId: string;

    @IsNotEmpty()
    @IsString()
    ticketSection: string;

    @IsNotEmpty()
    @IsNumber()
    quantity: number;

    @IsNotEmpty()
    price: string | number;

    @IsNotEmpty()
    @IsString()
    hash: string;

    @IsNotEmpty()
    @IsNumber()
    timestamp: number;

    @IsBoolean()
    is_used: boolean;

    @IsOptional()
    validated_at: Date | null;

    @IsOptional()
    @IsString()
    eventName?: string;

    @IsOptional()
    @IsUUID()
    eventId?: string;

    @IsOptional()
    eventDate?: Date | string;
}