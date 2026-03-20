import { IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { SubscriptionPlanTypeEnum } from 'src/common/enums/suscription-plan-type-enum/suscription-plan-type.enum';

export class UpdateSubscriptionDto {
    @IsOptional()
    @IsEnum(SubscriptionPlanTypeEnum)
    plan_type?: SubscriptionPlanTypeEnum;

    @IsOptional()
    @IsDateString()
    end_date?: Date;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}