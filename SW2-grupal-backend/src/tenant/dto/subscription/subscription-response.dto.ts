import { Exclude, Expose, Type } from 'class-transformer';
import { TenantResponseDto } from '../tenant/tenant-response.dto';
import { SubscriptionPlanTypeEnum } from 'src/common/enums/suscription-plan-type-enum/suscription-plan-type.enum';

@Exclude()
export class SubscriptionResponseDto {
    @Expose()
    id: string;

    @Expose()
    plan_type: SubscriptionPlanTypeEnum;

    @Expose()
    start_date: Date;

    @Expose()
    end_date: Date;

    @Expose()
    active: boolean;

    @Expose()
    created_at: Date;

    @Expose()
    @Type(() => TenantResponseDto)
    tenant: TenantResponseDto;
}