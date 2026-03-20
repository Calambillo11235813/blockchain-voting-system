import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TenantResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    display_name: string;

    @Expose()
    logo_url?: string;

    @Expose()
    active: boolean;

    @Expose()
    created_at: Date;
}