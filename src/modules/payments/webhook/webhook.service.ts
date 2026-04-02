// src/modules/payments/webhook.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { Inject } from '@nestjs/common';
import { STRIPE_CLIENT } from 'src/common/stripe/stripe.constant';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ConfigType } from '@nestjs/config';
import stripeConfig from 'src/config/stripe.config';
import { BookingHoldService } from 'src/modules/booking/booking-hold.service';
import { BookingStatus, PaymentStatus } from 'generated/prisma';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @Inject(stripeConfig.KEY) private readonly stripeCfg: ConfigType<typeof stripeConfig>,
    private readonly bookingHoldService: BookingHoldService
  ) { }

  private async safeReleaseHold(bookingId: string) {
    try {
      await this.bookingHoldService.releaseBookingHold(bookingId);
    } catch (err) {
      this.logger.error(
        `Không thể thả khoá ghế cho  ${bookingId}, lỗi: ${err?.message}.` +
        `Ghế sẽ khả dụng sau khi hết thời gian chờ `
      );

    }
  }

  async handleEvent(signature: string, rawBody: Buffer) {


    if (!signature) {// kiểm tra có signatur không
      throw new BadRequestException('Không tìm thấy signature');
    }

    let event: Stripe.Event;//khởi tạo stripe

    const webHookSecret = this.stripeCfg.webHookSecret;//lấy webHookSecret
    if (!webHookSecret) {
      throw new Error('Không tìm thấy webHookSecret');
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


    const objectId = (event.data.object as any)?.id || `unknown`;
    this.logger.log(`Nhận stripe webhook [${event.type}] for object ${objectId}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;


      if (session.payment_status !== 'paid') {
        this.logger.log(`Bỏ qua session ${session.id}:trạng thái thanh toán = ${session.payment_status}`);
        return;
      }

      const bookingId = session.metadata?.booking_id;
      if (!bookingId) {
        this.logger.log(`Không tìm thấy booking_id, session = ${session.id}`);
        return;
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      if (!paymentIntentId) {
        this.logger.warn(`checkot.session.completed thiếu payment_intent, session = ${session.id}`);
        return;
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
          this.logger.warn(`Bỏ qua do trùng lặp bookingId ${bookingId} đã được xử lý cho sự kiện ${event.type}.`)
          return;
        }

        this.logger.log(`Xử lí thành công booking [${bookingId}] with intent [${paymentIntentId}]`);

        await tx.payments.updateMany({
          where: {
            booking_id: bookingId,
            status: PaymentStatus.pending,
            is_deleted: false,
          },
          data: {
            status: PaymentStatus.success,
            transaction_id: paymentIntentId,
            updated_at: new Date(),
          },
        });
        this.logger.log(`Xử lí thanh toán thành công cho booking: [${bookingId}]`);
      });
      await this.safeReleaseHold(bookingId);
      return;
    }

    //xử lí booking và nhả ghế nếu thanh toán thấp bại
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.booking_id;
      if (!bookingId) {
        this.logger.warn(`payment_intent.payment_failed:Không tìm thấy booking_id`);
        return;
      }
      this.logger.log(`Xử lí thanh toán thấp bại cho booking: [${bookingId}]`);
      await this.prisma.$transaction([
        this.prisma.bookings.updateMany({
          where: {
            id: bookingId,
            status: BookingStatus.pending,
            is_deleted: false,
          },
          data: {
            status: BookingStatus.failed,
            updated_at: new Date(),
          },
        }),
        this.prisma.payments.updateMany({
          where: {
            booking_id: bookingId,
            status: PaymentStatus.pending,
            is_deleted: false,
          },
          data: {
            status: PaymentStatus.failed,
            updated_at: new Date(),
          },
        }),
      ]);
      this.logger.log(`Đã xử lí thanh toán thấp bại cho booking: [${bookingId}]`);
      await this.safeReleaseHold(bookingId);// nhả ghế nếu thanh toán thấp bại
      return;
    }

    //logic xử lí booking và nhả ghế nếu hết hạn thời gian thanh toán
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId){
        this.logger.warn(`Cảnh báo: Thiếu 'booking_id' trong phần metadata của phiên (session) hết hạn ${session.id}. Bỏ qua quá trình xử lý.`);
        return;
      }

      this.logger.log(`Xử lí thanh toán hết hạn cho booking: [${bookingId}]`);

      await this.prisma.$transaction([
        this.prisma.bookings.updateMany({
          where: {
            id: bookingId,
            is_deleted: false,
            status: BookingStatus.pending
          },
          data: {
            status: BookingStatus.expired,
            updated_at: new Date()
          },
        }),
        this.prisma.payments.updateMany({
          where: {
            booking_id: bookingId,
            status: PaymentStatus.pending,
            is_deleted: false
          },
          data: {
            status: PaymentStatus.failed,
            updated_at: new Date()
          }
        })
      ])
      this.logger.log(`Xử lí thanh toán hết hạn cho booking: [${bookingId}]`);
      await this.safeReleaseHold(bookingId);
      return;
    }
    this.logger.log(`Không nhận dạng được loại sự kien: ${event.type}`);
  }
}
