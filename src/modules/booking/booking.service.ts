// bookings.service.ts
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { HOLD_TTL_SECONDS } from 'src/common/constant/app.constant';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';


@Injectable()
export class BookingsService {

  //script Lua for redis
  private readonly SAFE_RELEASE_LUA_SCRIPT =`
  if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
    else
    return 0
  end
  `;

  constructor(private prisma: PrismaService,
     @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis
    ) {}
  
  private async cacheSetJSON(key: string, value: unknown, ttlSeconds: number) {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
  private async cacheGetJSON<T = unknown>(key: string): Promise<T | undefined> {
    const raw = await this.redisClient.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }


  async holdSeats(showtimeId: string, seatIds: number[], userId: string) {
    const ttl = Number(HOLD_TTL_SECONDS) || 300;

    // Dùng pipeline để giữ nhiều ghế 1 lúc
    const pipe = this.redisClient.multi();
    for (const seatId of seatIds) {
      const key = `hold:${showtimeId}:${seatId}`;
      //pipe.set('SET', key, userId, 'NX', 'EX', ttl); // SET NX EX <ttl>
      (pipe as any).call('SET', key, userId, 'NX', 'EX', String(ttl));
    }
    const results = await pipe.exec();

    // Nếu có ghế không lock được → rollback các key đã set và báo lỗi
    const failed = results?.some((r) => r == null || r[1] !== 'OK');
    if (failed) {
      const cleanup = this.redisClient.multi();
      for (const seatId of seatIds) {
        cleanup.del(`hold:${showtimeId}:${seatId}`);
      }
      await cleanup.exec();
      throw new BadRequestException('Một hoặc nhiều ghế đang được giữ bởi người khác');
    }
  }

  private async calculateTotalPriceAndSeatData(
    showtimeId: string,
    seatIds: number[],
    userId: string,
  ): Promise<{
    total_price: number;
    bookingSeatData: {
      seat_id: number;
      price: number;
      created_by: string;
    }[];
  }> {
    const showtime = await this.prisma.showtimes.findUnique({
      where: { id: showtimeId },
      select: {
        show_date: true,
        show_time: true,
        base_price: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime không tồn tại');
    }

    const dayOfWeek = new Date(showtime.show_date).getDay();

    const ticketPricing = await this.prisma.ticket_prices.findFirst({
      where: {
        day_of_week: dayOfWeek,
        time_start: { lte: showtime.show_time },
        time_end: { gte: showtime.show_time },
        is_deleted: false,
        is_active: true,
      },
    });

    const surcharge = ticketPricing?.base_price?.toNumber() || 0;
    const basePrice = showtime.base_price?.toNumber() || 0;

    const seats = await this.prisma.seats.findMany({
      where: { id: { in: seatIds }, is_deleted: false },
      include: { seat_types: true },
    });

    if (seats.length !== seatIds.length) {
      throw new NotFoundException('Một hoặc nhiều ghế không hợp lệ');
    }

    let total_price = 0;
    const bookingSeatData = seats.map((seat) => {
      const extra = seat.seat_types?.extra_price?.toNumber() || 0;
      const price = basePrice + extra + surcharge;
      total_price += price;
      return {
        seat_id: seat.id,
        price,
        created_by: userId,
      };
    });

    return { total_price, bookingSeatData };
  }

   async create(dto: CreateBookingDto, userId: string) {
    const { showtime_id, seat_ids } = dto;
    const { total_price, bookingSeatData } =
      await this.calculateTotalPriceAndSeatData(showtime_id, seat_ids, userId);

    const bookedSeats = await this.prisma.booking_seats.findMany({
      where: {
        seat_id: { in: seat_ids },
        bookings: {
          showtime_id,
          OR: [{ status: 'success' }, { status: 'pending', user_id: userId }],
        },
      },
    });
    if (bookedSeats.length > 0) {
      const ids = bookedSeats.map((bs) => bs.seat_id).join(',');
      throw new BadRequestException(`Seat ${ids} is already booked`);
    }

    await this.holdSeats(showtime_id, seat_ids, userId);

    const createdBooking = await this.prisma.bookings.create({
      data: {
        showtime_id,
        user_id: userId,
        total_price,
        created_by: userId,
        booking_seats: { create: bookingSeatData },
      },
      include: { booking_seats: true },
    });
    //dùng redisClient helper + JSON + TTL tính bằng giây
    await this.cacheSetJSON(
      `booking:${createdBooking.id}:seats`,
      seat_ids,
      Number(HOLD_TTL_SECONDS) || 300,
    );

    return createdBooking;
  }



  async confirmPayment(bookingId: string, userId: string) {
    const booking = await this.prisma.bookings.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.user_id !== userId) throw new ForbiddenException('Forbidden');
    if (booking.status !== 'pending') throw new BadRequestException('Booking is not pending');

    const seatIds = await this.cacheGetJSON<number[]>(`booking:${bookingId}:seats`);
    if (!seatIds?.length) throw new BadRequestException('No held seats found for this booking');

    if (!booking.showtime_id) throw new BadRequestException('Showtime ID is missing from booking');

    const { total_price, bookingSeatData } =
      await this.calculateTotalPriceAndSeatData(booking.showtime_id, seatIds, userId);

    await this.prisma.booking_seats.createMany({ data: bookingSeatData });

    return this.prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: 'success',
        total_price,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  }



  findAll() {
    return this.prisma.bookings.findMany({
      where: { is_deleted: false },
      include: { booking_seats: true },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id, is_deleted: false },
      include: { booking_seats: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancel(id: string, userId: string) {
    return this.prisma.bookings.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
        booking_seats: {
          updateMany: {
            where: {},
            data: {
              is_deleted: true,
              deleted_by: userId,
              deleted_at: new Date(),
            },
          },
        },
      },
    });
  }
}
