import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaymentMethod } from 'src/common/enums/payment-method-enum/payment-method.enum';

export class CreatePaymentDto {
    @IsEnum(PaymentMethod)
    method: PaymentMethod;

    @IsOptional()
    @IsString()
    paymentMethodId?: string;

    @IsOptional()
    @IsString()
    transactionId?: string;

    @IsOptional()
    @IsBoolean()
    simulatePayment?: boolean;
}