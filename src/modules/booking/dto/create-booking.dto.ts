// dto/create-booking.dto.ts
import { ArrayMaxSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  showtime_id: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsNotEmpty()
  seat_ids: number[];
}