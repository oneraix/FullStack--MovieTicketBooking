import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from 'src/common/stripe/stripe.service';
import stripeConfig from 'src/config/stripe.config';
import Stripe from 'stripe';
import { BookingStatus } from 'generated/prisma';
import appConfig from 'src/config/app.config';
import { PaymentListQueryDto } from './dto/payment-list.query.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,

    @Inject(stripeConfig.KEY)
    private readonly config: ConfigType<typeof stripeConfig>,

    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

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

    if(!booking.booking_seats.length) {
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
      payment_intent_data:{
        metadata:{
          booking_id: dto.booking_id,
        },
      },
      // Tự động expire session sau 30 phút
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    this.logger.log(`Checkout session created for booking ${dto.booking_id}`);
    return { url: session.url, session_id: session.id };
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

  // ─── Admin: lấy tất cả payments ──────────────────────────────────────────
  async findAll(query: PaymentListQueryDto) {
    const safePage = query.page ?? 1;
    const safeLimit = query.limit ?? 10;
    const skip = (safePage -1)* safeLimit; 

    const where = {
      is_deleted: false,
      ...(query.status && { status: query.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where,
        include:{
          bookings:{
            select:{
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
    return{
      items,
      pagination:{
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
        payments: true
      }
    });

    if (!booking || booking.user_id !== userId) {
      throw new NotFoundException('Booking không tồn tại');
    }

    // if(!booking.booking_seats.length) {
    //   throw new NotFoundException('Booking rỗng');
    // }

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
