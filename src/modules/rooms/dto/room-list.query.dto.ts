import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RoomListQueryDto {
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
  @Type(() => Number)
  @IsInt()
  cinema_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  screen_type_id?: number;
}
