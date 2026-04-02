// dto/create-booking.dto.ts
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  showtime_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(1,{each: true})
  seat_ids: number[];
}