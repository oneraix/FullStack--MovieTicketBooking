import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { stat } from "fs";
import { PaymentStatus } from "generated/prisma";
import { number } from "joi";

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