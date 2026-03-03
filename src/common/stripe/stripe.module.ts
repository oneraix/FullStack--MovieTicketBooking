import { Module } from '@nestjs/common';
import { stripeProvider } from './stripe.provider';
import { StripeService } from './stripe.service';
import { STRIPE_CLIENT } from './stripe.constant';

@Module({
  providers: [stripeProvider, StripeService],
  exports: [StripeService, STRIPE_CLIENT],
})
export class StripeModule {}
