import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100)  name?: string;
  @IsOptional() @IsString() @MaxLength(20)   phone?: string;
  @IsOptional() @IsUrl()                     avatar?: string;
}