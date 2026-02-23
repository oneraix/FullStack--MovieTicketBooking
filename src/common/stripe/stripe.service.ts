import { Inject, Injectable } from '@nestjs/common';
import { STRIPE_CLIENT } from './stripe.constant';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe) {}

  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return await this.stripe.checkout.sessions.create(params);
  }

  async retriveCheckoutSession(sessionId:string){
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
