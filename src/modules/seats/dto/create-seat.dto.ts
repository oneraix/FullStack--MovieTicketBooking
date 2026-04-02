import { IsNotEmpty, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateSeatDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  room_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  seat_number: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  seat_type_id?: number;
}