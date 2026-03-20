import { IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MinLength } from "class-validator";

export class SubscriptionCreateDTO {
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    subscriptionId: string;

    @IsString()
    @IsUrl()
    name: string

    @IsString()
    @MinLength(5)
    displayName: string

    @IsOptional()
    @IsString()
    @IsUUID()
    userId?: string;
}