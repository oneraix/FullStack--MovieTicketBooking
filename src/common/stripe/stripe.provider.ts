import { STRIPE_SECRET_KEY } from '../constant/app.constant';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constant';

export const stripeProvider = {
  provide: STRIPE_CLIENT,
  useFactory: () => {
    return new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });
  },
};
