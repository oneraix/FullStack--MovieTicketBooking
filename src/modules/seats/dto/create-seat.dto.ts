import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSeatDto {
  @IsInt()
  @IsNotEmpty()
  room_id: number;

  @IsString()
  @IsNotEmpty()
  seat_number: string;

  @IsInt()
  @IsOptional()
  seat_type_id?: number;
}