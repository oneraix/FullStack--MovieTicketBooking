import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class MovieListQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number) @IsInt() @Min(1) @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    @IsOptional()
    @IsString()
    genre?: string;

    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    is_showing?: boolean;
}
