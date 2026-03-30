import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID, IsArray, IsDateString, ValidateIf } from 'class-validator';
import { PriceModificationType } from 'src/common/enums/price-modification-type-enum/price-modification-type.enum';

export class BulkUpdateTicketPriceDto {
    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    price: number;

    @IsEnum(PriceModificationType)
    @IsNotEmpty()
    modificationType: PriceModificationType;

    @IsDateString()
    @IsOptional()
    validFrom?: Date;

    @IsDateString()
    @IsOptional()
    validUntil?: Date;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    ticketIds?: string[]; // Si se proporciona, actualiza solo estos tickets

    @IsUUID('4')
    @IsOptional()
    @ValidateIf(o => !o.ticketIds || o.ticketIds.length === 0)
    sectionId?: string; // Si se proporciona, actualiza todos los tickets de la sección

    // Si ninguno de los anteriores se proporciona, se actualizarán todos los tickets
}