import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketPriceDto } from './create-ticket_price.dto';

export class UpdateTicketPriceDto extends PartialType(CreateTicketPriceDto) {}
