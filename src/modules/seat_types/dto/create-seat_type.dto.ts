import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSeatTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  extra_price?: number;
}