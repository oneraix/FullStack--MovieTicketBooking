// src/modules/payments/webhook.service.ts
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { Inject } from '@nestjs/common';
import { STRIPE_CLIENT } from 'src/common/stripe/stripe.constant';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ConfigType } from '@nestjs/config';
import stripeConfig from 'src/config/stripe.config';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
import { BookingHoldService } from 'src/modules/booking/booking-hold.service';
import { BookingStatus, PaymentStatus } from 'generated/prisma';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @Inject(stripeConfig.KEY) private readonly stripeCfg: ConfigType<typeof stripeConfig>,
    private readonly bookingHoldService: BookingHoldService
  ) { }



  async handleEvent(signature: string, rawBody: Buffer) {


    if (!signature) {// kiểm tra có signatur không
      throw new BadRequestException('Không tìm thấy signature');
    }

    let event: Stripe.Event;//khởi tạo stripe

    const webHookSecret = this.stripeCfg.webHookSecret;//lấy webHookSecret
    if (!webHookSecret) {
      throw new Error('Không tìm thấy signature');
    }
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webHookSecret,
      );
    } catch (err) {
      throw new BadRequestException('Stripe signature không hợp lệ');//lỗi signature không hợp lệ đổi từ 500 thành 400
    }

if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== 'paid') return;

  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    throw new BadRequestException('Không tìm thấy booking_id');
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new BadRequestException('Không tìm thấy payment_intent');
  }

  await this.prisma.$transaction(async (tx) => {
    const updated = await tx.bookings.updateMany({
      where: {
        id: bookingId,
        status: BookingStatus.pending,
        is_deleted: false,
      },
      data: {
        status: BookingStatus.success,
        updated_at: new Date(),
      },
    });

    if (updated.count === 0) {
      return;
    }

    const booking = await tx.bookings.findUnique({
      where: { id: bookingId },
      select: { user_id: true },
    });

    await tx.payments.create({
      data: {
        booking_id: bookingId,
        method: session.payment_method_types?.[0] ?? 'card',
        status: PaymentStatus.success,
        transaction_id: paymentIntentId,
        created_by: booking?.user_id ?? undefined,
      },
    });
  });

  await this.bookingHoldService.deleteBookingHold(bookingId);
  return;
}

    //xử lí booking và nhả ghế nếu thanh toán thấp bại
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.booking_id;
      if (bookingId) {
        await this.prisma.bookings.updateMany({
          where: {
            id: bookingId,
            status: BookingStatus.pending,
          },
          data: {
            status: BookingStatus.failed,
            updated_at: new Date(),
          },
        });
        await this.bookingHoldService.releaseBookingHold(bookingId);// nhả ghế nếu thanh toán thấp bại
      }
      return;
    }

    //logic xử lí booking và nhả ghế nếu hết hạn thời gian thanh toán
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) return;

      await this.prisma.bookings.updateMany({
        where: { id: bookingId, status: BookingStatus.pending },
        data: { status: BookingStatus.expired, updated_at: new Date() },
      });

      await this.bookingHoldService.releaseBookingHold(bookingId);

      return;
    }

  }
}
