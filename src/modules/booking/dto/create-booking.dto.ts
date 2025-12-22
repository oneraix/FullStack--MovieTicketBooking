// dto/create-booking.dto.ts
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  showtime_id: string;

  @IsArray()
  @IsNotEmpty()
  seat_ids: number[];
}