import { STRIPE_SECRET_KEY } from '../constant/app.constant';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constant';
import { ConfigType } from '@nestjs/config';
import stripeConfig from 'src/config/stripe.config';


export const stripeProvider = {
  provide: STRIPE_CLIENT,
  useFactory: (config: ConfigType<typeof stripeConfig>) => {
    return new Stripe(config.apiKey!, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    });
  },

  inject: [stripeConfig.KEY],
};
