// src/modules/payments/webhook.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';

import { STRIPE_SECRET_WEBHOOK } from 'src/common/constant/app.constant';
import { Inject } from '@nestjs/common';
import { STRIPE_CLIENT } from 'src/common/stripe/stripe.constant';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  async handleEvent(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_SECRET_WEBHOOK,
      );
    } catch (err) {
      throw new InternalServerErrorException('Invalid Stripe Signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;

      await this.prisma.bookings.update({
        where: { id: bookingId },
        data: {
          status: 'success',
          updated_at: new Date(),
        },
      });
    }

    // Các sự kiện khác nếu muốn xử lý
  }
}
