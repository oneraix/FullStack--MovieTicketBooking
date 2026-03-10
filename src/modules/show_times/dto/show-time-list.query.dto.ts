import { Type } from "class-transformer";
import { IS_ALPHA, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class ShowTimeListQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
    
    @IsOptional()
    @IsUUID()
    movie_id?: string;

    @IsOptional()
    @IsString()
    show_date?: string;
}