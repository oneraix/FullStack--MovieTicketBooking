import { Module } from '@nestjs/common';
import { stripeProvider } from './stripe.provider';
import { StripeService } from './stripe.service';

@Module({
  providers: [stripeProvider, StripeService],
  exports: [StripeService],
})
export class StripeModule {}
