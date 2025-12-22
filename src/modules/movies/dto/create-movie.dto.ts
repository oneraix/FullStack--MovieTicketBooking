import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsDateString()
  @IsOptional()
  release_date?: Date;

  @IsOptional()
  @IsBoolean()
  is_showing?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  genre_ids: number[]; // <-- liên kết bảng trung gian
}
