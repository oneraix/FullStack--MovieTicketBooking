import { PartialType } from '@nestjs/mapped-types';
import { CreateScreenTypeDto } from './create-screen_type.dto';

export class UpdateScreenTypeDto extends PartialType(CreateScreenTypeDto) {}
