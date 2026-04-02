import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class CreateShowtimeDto {
  @IsNotEmpty()
  @IsUUID()
  movie_id: string;

  @Min(1)
  @IsInt()
  room_id: number;

  @Type(()=>Number)
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  base_price: number;

  @IsDateString()
  show_date: string; // ISO Date

  @IsDateString()
  show_time: string; // ISO Time (in full ISO string)
}
