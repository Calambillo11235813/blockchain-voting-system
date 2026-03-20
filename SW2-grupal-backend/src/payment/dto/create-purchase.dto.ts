import { IsArray, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseSectionDto {
    @IsNotEmpty()
    @IsUUID()
    sectionId: string;

    @IsNotEmpty()
    @IsPositive()
    quantity: number;
}

export class CreatePurchaseDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseSectionDto)
    items: PurchaseSectionDto[];

    @IsOptional()
    @IsString()
    observations?: string;
}