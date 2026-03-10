import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { TicketPricesController } from './ticket_prices.controller';
import { TicketPricesService } from './ticket_prices.service';

@Module({
    imports:[PrismaModule],
    controllers:[TicketPricesController],
    providers:[TicketPricesService]
})
export class TicketPricesModule {}
