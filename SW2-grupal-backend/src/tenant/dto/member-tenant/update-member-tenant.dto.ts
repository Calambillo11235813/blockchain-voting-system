import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMemberTenantDto {
    @IsOptional()
    @IsUUID()
    roleId?: string;

    @IsOptional()
    @IsString()
    password_tenant?: string;

    @IsOptional()
    @IsString()
    tenant_address?: string;

    @IsOptional()
    @IsString()
    event_address?: string;
}