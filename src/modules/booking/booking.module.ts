import { Module } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';


@Module({
  controllers: [BookingsController],
  providers: [BookingsService,PrismaService],
})
export class BookingModule {}
