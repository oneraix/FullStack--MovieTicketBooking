import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { PaymentStatus } from "generated/prisma";

export class PaymentListQueryDto{
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?:number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?:number;

    @IsOptional()
    @IsEnum(PaymentStatus)
    status?:PaymentStatus;
}