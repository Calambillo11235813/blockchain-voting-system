import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMemberTenantDto {
    @IsNotEmpty()
    @IsUUID()
    userId: string;

    @IsNotEmpty()
    @IsUUID()
    tenantId: string;

    @IsNotEmpty()
    @IsUUID()
    roleId: string;

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