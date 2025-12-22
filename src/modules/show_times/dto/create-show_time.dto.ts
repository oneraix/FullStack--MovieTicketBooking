import { IsDateString, IsDecimal, IsInt, IsUUID } from "class-validator";

export class CreateShowtimeDto {
  @IsUUID()
  movie_id: string;

  @IsInt()
  room_id: number;

  @IsDecimal()
  base_price: number;

  @IsDateString()
  show_date: string; // ISO Date

  @IsDateString()
  show_time: string; // ISO Time (in full ISO string)
}
