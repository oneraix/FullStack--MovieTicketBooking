// bookings.service.ts
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { HOLD_TTL_SECONDS } from 'src/common/constant/app.constant';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
import { BookingHoldService } from './booking-hold.service';


@Injectable()
export class BookingsService {

  //script Lua for redis
  // private readonly SAFE_RELEASE_LUA_SCRIPT =`
  // if redis.call("get",KEYS[1]) == ARGV[1] then
  //   return redis.call("del",KEYS[1])
  //   else
  //   return 0
  // end
  // `;

  constructor(
    private prisma: PrismaService,
    private readonly bookingHoldService: BookingHoldService 
  ) {}
  

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
        room_id: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime không tồn tại');
    }

    if(!showtime.room_id){
      throw new BadRequestException('Phòng chiếu không tồn tại');
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
      where: { id: { in: seatIds }, is_deleted: false, room_id:showtime.room_id },
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

  //create tạo booking(pending), booking_seats, giữ ghế bằng redis seatHold -> Paymentservice tạo session checkout -> webhook
   async create(dto: CreateBookingDto, userId: string) {
    const { showtime_id, seat_ids } = dto;

    //bắt lỗi trùng ids ghế (1)
    const uniq = Array.from(new Set(seat_ids));
    if (uniq.length !== seat_ids.length) {
      throw new BadRequestException('Ghế bị trùng');
    }

    //tính tống tien (2)
    const { total_price, bookingSeatData } =
    await this.calculateTotalPriceAndSeatData(showtime_id, seat_ids, userId);


    // giữ ghế trước khi truy vấn database (3)
    await this.bookingHoldService.holdSeats(showtime_id, seat_ids, userId);
    try{
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

    //tạo booking (4)
    const createdBooking = await this.prisma.bookings.create({
      data: {
        showtime_id,
        user_id: userId,
        total_price,
        created_by: userId,
        booking_seats: { create: bookingSeatData },
      },
      include:{booking_seats: true},
    });

await this.bookingHoldService.cacheBookingHold(createdBooking.id, {
  showtimeId: showtime_id,
  seatIds: seat_ids,
  userId,
});
    return createdBooking; 
  } catch(e){
    await this.bookingHoldService.releaseSeats(showtime_id, seat_ids, userId);// nếu lỗi thì release toan bo ghe của booking
    throw e;
  }



    // const createdBooking = await this.prisma.bookings.create({
    //   data: {
    //     showtime_id,
    //     user_id: userId,
    //     total_price,
    //     created_by: userId,
    //     booking_seats: { create: bookingSeatData },
    //   },
    //   include: { booking_seats: true },
    // });
    // //dùng redisClient helper + JSON + TTL tính bằng giây
    // await this.cacheSetJSON(
    //   `booking:${createdBooking.id}:seats`,
    //   seat_ids,
    //   Number(HOLD_TTL_SECONDS) || 300,
    // );

    // return createdBooking;
  }

  // async confirmPayment(bookingId: string, userId: string) {
  //   const booking = await this.prisma.bookings.findUnique({ where: { id: bookingId } });
  //   if (!booking) throw new NotFoundException('Booking not found');
  //   if (booking.user_id !== userId) throw new ForbiddenException('Forbidden');
  //   if (booking.status !== 'pending') throw new BadRequestException('Booking is not pending');

  //   const seatIds = await this.cacheGetJSON<number[]>(`booking:${bookingId}:seats`);
  //   if (!seatIds?.length) throw new BadRequestException('No held seats found for this booking');

  //   if (!booking.showtime_id) throw new BadRequestException('Showtime ID is missing from booking');

  //   const { total_price, bookingSeatData } =
  //   await this.calculateTotalPriceAndSeatData(booking.showtime_id, seatIds, userId);

  //   //await this.prisma.booking_seats.createMany({ data: bookingSeatData });

  //   return this.prisma.bookings.update({
  //     where: { id: bookingId },
  //     data: {
  //       status: 'success',
  //       total_price,
  //       updated_at: new Date(),
  //       updated_by: userId,
  //     },
  //   });
  // }



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
