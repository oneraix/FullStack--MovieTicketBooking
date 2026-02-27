import { Module } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingHoldService } from './booking-hold.service';


@Module({
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService, BookingHoldService],
  exports:[BookingHoldService]
})
export class BookingModule { }
