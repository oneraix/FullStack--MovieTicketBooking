import { PartialType } from '@nestjs/mapped-types';
import { CreateShowtimeDto } from './create-show_time.dto';


export class UpdateShowTimeDto extends PartialType(CreateShowtimeDto) {}
