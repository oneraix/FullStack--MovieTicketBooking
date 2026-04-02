import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto';
import { IsOptional, IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {
}
