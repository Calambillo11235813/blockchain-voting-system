import { IsNotEmpty, IsString, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateTenantDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Tenant name can only contain lowercase letters, numbers, and hyphens'
    })
    name: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    display_name: string;

    @IsOptional()
    @IsString()
    logo_url?: string;
}