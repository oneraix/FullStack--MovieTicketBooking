import { Module } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { BookingHoldService } from './booking-hold.service';
import { StripeModule } from 'src/common/stripe/stripe.module';


@Module({
  imports: [StripeModule],
  controllers: [BookingsController],
  providers: [BookingsService,  BookingHoldService, ],
  exports:[BookingHoldService]
})
export class BookingModule { }
