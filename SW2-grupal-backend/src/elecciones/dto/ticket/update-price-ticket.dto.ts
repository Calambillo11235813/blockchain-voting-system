import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { PriceModificationType } from 'src/common/enums/price-modification-type-enum/price-modification-type.enum';

export class UpdateTicketPriceDto {
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    price: number;

    @IsNotEmpty()
    @IsEnum(PriceModificationType)
    modificationType: PriceModificationType;

    @IsOptional()
    @IsDateString()
    validFrom?: Date;

    @IsOptional()
    @IsDateString()
    validUntil?: Date;

    @IsOptional()
    @IsUUID()
    sectionId?: string;
}