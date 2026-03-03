import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { BookingStatus, PaymentStatus } from "generated/prisma";

export class BookingListQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsEnum(BookingStatus)
    status?: BookingStatus;

    @IsOptional()
    @IsEnum(PaymentStatus)
    payment_status?: PaymentStatus;

    @IsOptional()
    @IsUUID()
    movie_id?: string;

    @IsOptional()
    @IsUUID()
    showtime_id?: string;

    @IsOptional()
    @IsString()
    from_date?: string;

    @IsOptional()
    @IsString()
    to_date?: string;

    @IsOptional()
    @IsString()
    search?: string;
}