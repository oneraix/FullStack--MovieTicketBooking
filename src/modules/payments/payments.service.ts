import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from 'src/common/stripe/stripe.service';
import stripeConfig from 'src/config/stripe.config';
import Stripe from 'stripe';
import { BookingStatus, PaymentStatus } from 'generated/prisma';
import appConfig from 'src/config/app.config';
import { PaymentListQueryDto } from './dto/payment-list.query.dto';
import redisConfig from 'src/config/redis.config';
import { BookingHoldService } from '../booking/booking-hold.service';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly bookingHoldService: BookingHoldService,

    @Inject(stripeConfig.KEY)
    private readonly config: ConfigType<typeof stripeConfig>,

    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,

    @Inject(redisConfig.KEY)
    private readonly redisCfg: ConfigType<typeof redisConfig>,

  ) { }

  async createCheckoutSession(dto: CreatePaymentDto, userId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: dto.booking_id },
      include: {
        booking_seats: {
          include: {
            seats: {
              include: { seat_types: true },
            },
          },
        },
        showtimes: {
          include: { movies: true },
        },
      },
    });

    if (!booking || booking.user_id !== userId) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (booking.status !== BookingStatus.pending) {
      throw new NotFoundException('Booking không đang chờ thanh toán');
    }

    if (!booking.booking_seats.length) {
      throw new NotFoundException('Booking không có danh sách ghế');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      booking.booking_seats.map((bs) => ({
        price_data: {
          currency: 'vnd',
          unit_amount: Math.round(bs.price?.toNumber() ?? 0),
          product_data: {
            name: `${booking.showtimes?.movies?.title ?? 'Movie'} — Seat ${bs.seats?.seat_number ?? ''} (${bs.seats?.seat_types?.name ?? 'Standard'})`,
          },
        },
        quantity: 1,
      }));

    const lockValue = await this.bookingHoldService.acquirePaymentLock(dto.booking_id)

    if (!lockValue) {
      this.logger.warn(`Xung đột yêu cầu thanh toán: Phát hiện nhiều yêu cầu cùng lúc cho một mã đặt vé.${dto.booking_id}`);
      throw new ConflictException(`Hệ thống đang xử lí thanh toán cho giao dịch này, vui lòng không thanh toán quá nhanh.`);
    }
    try{
    const existingPayment = await this.prisma.payments.findFirst({
      where: {
        booking_id: dto.booking_id,
        status: PaymentStatus.pending,
        is_deleted: false,
        stripe_session_id: {
          not: null
        },
      },
    });

    if (existingPayment?.stripe_session_id) {
      try {
        const existing = await this.stripeService.retrieveCheckoutSession(existingPayment.stripe_session_id);
        if (existing.status === 'open') {
          return { url: existing.url, session_id: existing.id };
        }
      } catch(err) {
        this.logger.warn(`Không thể truy xuất phiên thanh toán Stripe hiện có ${existingPayment.stripe_session_id}: ${err?.message}. Đang tiến hành khởi tạo phiên mới.`)
      }
    }

    const successUrl = `${this.appCfg.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.appCfg.frontendUrl}/cancel`;
    const session = await this.stripeService.createCheckoutSession({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,//'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,//'http://localhost:3000/cancel',
      metadata: {
        booking_id: dto.booking_id,
      },
      payment_intent_data: {
        metadata: {
          booking_id: dto.booking_id,
        },
      },
      // Tự động expire session sau 30 phút
      expires_at: Math.floor(Date.now() / 1000) + Math.max(this.redisCfg.hold_ttl, 1800),
    });

    try {
      await this.prisma.payments.create({
        data: {
          booking_id: dto.booking_id,
          method: 'card',
          status: PaymentStatus.pending,
          stripe_session_id: session.id,
          created_by: userId,
        },
      });

    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.error(`Xung đột dữ liệu: Vi phạm ràng buộc Database cho đơn đặt vé ${dto.booking_id}, đang tiến hành hủy phiên thanh toán ${session.id} trên Stripe`)
      } else {
        this.logger.error(`Không thể tạo payment cho booking ${dto.booking_id}, lỗi: ${err?.message}.`);
      }
      try {
        await this.stripeService.expireCheckoutSession(session.id);
      } catch (expireErr) {
        this.logger.error(`Không thể kết thúc stripe session${session.id}: ${expireErr?.message}.`);
      }

      throw new ConflictException(`Đã xảy ra lỗi khi tạo phiên thanh toán, Vui lòng thử lại`);
    }
    this.logger.log(`Phiên thanh toán được tạo cho booking ${dto.booking_id}`);
    return { url: session.url, session_id: session.id };
  }finally{
    await this.bookingHoldService.releasePaymentLock(dto.booking_id,lockValue);
  }
}

  async findMyPayments(userId: string) {
    return this.prisma.payments.findMany({
      where: {
        is_deleted: false,
        bookings: { user_id: userId },
      },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            total_price: true,
            showtimes: {
              select: {
                show_date: true,
                show_time: true,
                movies: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }


  async findAll(query: PaymentListQueryDto) {
    const safePage = query.page ?? 1;
    const safeLimit = query.limit ?? 10;
    const skip = (safePage - 1) * safeLimit;

    const where = {
      is_deleted: false,
      ...(query.status && { status: query.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where,
        include: {
          bookings: {
            select: {
              id: true,
              status: true,
              total_price: true,
              user_id: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.payments.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      }
    }
  }


  async findOne(id: string, userId: string) {
    const payment = await this.prisma.payments.findFirst({
      where: {
        id,
        is_deleted: false,
        bookings: { user_id: userId },
      },
      include: {
        bookings: {
          include: {
            booking_seats: {
              include: { seats: { include: { seat_types: true } } },
            },
            showtimes: { include: { movies: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getCheckoutSessionStatus(sessionId: string, userId: string) {
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    const bookingId = session.metadata?.booking_id;
    if (!bookingId) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const booking = await this.prisma.bookings.findUnique({
      where: {
        id: bookingId
      },
      include: {
        payments: {
          orderBy: { created_at: 'desc' },
          take: 1,  
        }
      }
    });

    if (!booking || booking.user_id !== userId) {
      throw new NotFoundException('Booking không tồn tại');
    }



    return {
      sessionId: session.id,
      stripe_payment_status: session.payment_status,
      booking: {
        id: booking.id,
        status: booking.status,
        totalprice: booking.total_price,
      },
      payment: booking.payments?.[0] ? {
        id: booking.payments[0].id,
        status: booking.payments[0].status,
        transaction_id: booking.payments[0].transaction_id,
      }
        : null,
    }

  }

}
