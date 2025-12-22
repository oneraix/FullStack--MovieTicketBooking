import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from 'src/common/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createCheckoutSession(dto: CreatePaymentDto, userId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: dto.booking_id },
      include: {
        booking_seats: {
          include: {
            seats: {
              include: {
                seat_types: true,
              },
            },
          },
        },
        showtimes: {
          include: {
            movies: true,
          },
        },
      },
    });

    if (!booking || booking.user_id !== userId) {
      throw new NotFoundException('Booking not found');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      booking.booking_seats.map((bs) => ({
        price_data: {
          currency: 'vnd',
          unit_amount: (bs.price?.toNumber() ?? 0) ,
          product_data: {
            name: `${booking.showtimes?.movies?.title ?? 'Movie'} - ${bs.seats?.seat_types?.name ?? 'Seat'}`,
          },
        },
        quantity: 1,
      }));

    const session = await this.stripeService.createCheckoutSession({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        booking_id: dto.booking_id,
      },
    });

    return { url: session.url };
  }
}
