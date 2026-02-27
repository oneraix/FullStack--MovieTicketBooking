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

      //kiểm tra đã paid chưa rồi mới xử lí
      if (session.payment_status !== 'paid') return;

      const bookingId = session.metadata?.booking_id;

      if (!bookingId) throw new BadRequestException('Không tìm thấy booking_id');//đảm bảo có booking_id

      const booking = await this.prisma.bookings.findUnique({
        where: { id: bookingId }
      });

      if (!booking || booking.status !== 'pending') return; //tránh trường hợp server chậm Stripe gửi trùng webhook dẫn đến update trùng booking


      await this.prisma.$transaction([
        this.prisma.bookings.update({
          where: { id: bookingId },
          data: {
            status: 'success',
            updated_at: new Date(),
          },
        }),
        this.prisma.payments.create({
          data: {
            booking_id: bookingId,
            method: session.payment_method_types?.[0] ?? 'card',
            status: 'success',
            transaction_id: String(session.payment_intent ?? ''),//thay session.payment_intent as string thành String(session.payment_intent) ?? '' để đảm bảo chuỗi chuyển thành string và không crash nếu bị rỗng
            created_by: booking.user_id ?? undefined,
          },
        }),
      ]);
      await this.bookingHoldService.deleteBookingHold(bookingId);// xoa booking hold sau khi thanh toán thánh công
      return;
      // await this.prisma.bookings.update({
      //   where: { id: bookingId },
      //   data: {
      //     status: 'success',
      //     updated_at: new Date(),
      //   },
      // });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.booking_id;
      if (bookingId) {
        await this.prisma.bookings.updateMany({
          where: {
            id: bookingId,
            status: 'pending'
          },
          data: {
            status: 'failed',
            updated_at: new Date(),
          },
        });
        await this.bookingHoldService.releaseBookingHold(bookingId);// nhả ghế nếu thanh toán thấp bại
      }
      return;
    }

    //thêm logic xử lí booking và nhả ghế nếu hết hạn thời gian thanh toán
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) return;

      await this.prisma.bookings.updateMany({
        where: { id: bookingId, status: 'pending' },
        data: { status: 'expired', updated_at: new Date() },
      });

      await this.bookingHoldService.releaseBookingHold(bookingId);

      return;
    }

  }
}
