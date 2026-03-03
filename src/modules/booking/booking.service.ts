// bookings.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Search } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingHoldService } from './booking-hold.service';
import { BookingStatus, Prisma } from 'generated/prisma';
import { BookingListQueryDto } from './dto/booking-list.query.dto';

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
  ) { }

  private normalizePagination(page?: number, limit?: number) {
    const safePage = Number.isFinite(page) && page! > 0 ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit! > 0 ? Math.min(Number(limit), 100) : 10;
    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit
    };
  }

private buildBookingWhere(
  query: BookingListQueryDto,
  userId?: string,
): Prisma.bookingsWhereInput {
  const where: Prisma.bookingsWhereInput = {
    is_deleted: false,
  };

  if (userId) {
    where.user_id = userId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.payment_status) {
    where.payments = {
      some: {
        status: query.payment_status,
        is_deleted: false,
      },
    };
  }

  const showtimeWhere: Prisma.showtimesWhereInput = {};

  if (query.showtime_id) {
    showtimeWhere.id = query.showtime_id;
  }

  if (query.movie_id) {
    showtimeWhere.movie_id = query.movie_id;
  }

  if (query.search?.trim()) {
    showtimeWhere.movies = {
      is: {
        title: {
          contains: query.search.trim(),
          mode: 'insensitive',
        },
      },
    };
  }

  if (query.from_date || query.to_date) {
    const showDateFilter: Prisma.DateTimeFilter = {};

    if (query.from_date) {
      const from = new Date(`${query.from_date}T00:00:00.000Z`);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('from_date không hợp lệ');
      }
      showDateFilter.gte = from;
    }

    if (query.to_date) {
      const to = new Date(`${query.to_date}T23:59:59.999Z`);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('to_date không hợp lệ');
      }
      showDateFilter.lte = to;
    }

    showtimeWhere.show_date = showDateFilter;
  }

  if (Object.keys(showtimeWhere).length > 0) {
    where.showtimes = {
      is: showtimeWhere,
    };
  }

  return where;
}

  private bookingListSelect():Prisma.bookingsSelect{
    return{
      id: true,
      user_id:true,
      status: true,
      total_price: true,
      created_at: true,
      updated_at: true,

      users_bookings_user_idTousers:{
        select:{
          id: true,
          name: true,
          email: true,
          phone: true
        },
      },
      showtimes:{
        select:{
          id:true,
          show_date: true,
          show_time: true,
          base_price: true,
          movies:{
            select:{
              id:true,
              title:true,
              thumbnail:true,
              duration:true,
              age_limit:true,
            },
          },
          rooms:{
            select:{
              id:true,
              name:true,
              cinemas:{
                select:{
                  id:true,
                  name:true,
                  location:true
                },
              },
            },
          },
        },
      },
      booking_seats:{
        where:{
          is_deleted:false,
        },
        select:{
          id: true,
          seat_id: true,
          price: true,
          seats:{
            select:{
              id:true,
              seat_number:true,
              seat_types:{
                select:{
                  id:true,
                  name:true,
                  extra_price:true
                },
              },
            },
          },
        },
      },
      payments:{
        where:{
          is_deleted:false,
        },
        select:{
          id: true,
          method: true,
          status: true,
          transaction_id: true,
          created_at: true,
        },
        orderBy:{
          created_at:'desc'
        }
      }
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
        room_id: true, //dùng để validation tránh việc tạo booking cho ghế không tồn tại trong phòng
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime không tồn tại');
    }

    if (!showtime.room_id) {
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
      where: { id: { in: seatIds }, is_deleted: false, room_id: showtime.room_id },
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
    try {
      const bookedSeats = await this.prisma.booking_seats.findMany({
        where: {
          seat_id: { in: seat_ids },
          bookings: {
            showtime_id,
            OR: [{ status: BookingStatus.success }, { status: BookingStatus.pending, user_id: userId }],
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
        include: { booking_seats: true },
      });

      await this.bookingHoldService.cacheBookingHold(createdBooking.id, {
        showtimeId: showtime_id,
        seatIds: seat_ids,
        userId,
      });
      return createdBooking;
    } catch (e) {
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

  async findAllForAdmin(query: BookingListQueryDto) {
    const { page, limit, skip } = this.normalizePagination(query.page, query.limit);
    const where = this.buildBookingWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bookings.findMany({
        where,
        select: this.bookingListSelect(),
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.bookings.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      filters: {
        status: query.status ?? null,
        payment_status: query.payment_status ?? null,
        movie_id: query.movie_id ?? null,
        showtime_id: query.showtime_id ?? null,
        from_date: query.from_date ?? null,
        to_date: query.to_date ?? null,
        search: query.search ?? null,
      },
    };
  }


  async findOneForAdmin(id: string) {
    const booking = await this.prisma.bookings.findFirst({
      where: {
        id,
        is_deleted: false,
      },
      select: this.bookingListSelect(),
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async findMyBookings(userId: string, query: BookingListQueryDto) {
    const {page, limit, skip} = this.normalizePagination(query.page, query.limit);
    const where = this.buildBookingWhere(query, userId);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bookings.findMany({
        where,
        select: this.bookingListSelect(),
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
    }),
    this.prisma.bookings.count({ where }),
    ]);
    return {
      items,
      pagination:{
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      filters:{
        status: query.status ?? null,
        payment_status: query.payment_status ?? null,
        movie_id: query.movie_id ?? null,
        showtime_id: query.showtime_id ?? null,
        from_date: query.from_date ?? null,
        to_date: query.to_date ?? null,
        search: query.search ?? null
      },
    };
  }

  async findMyBooking(id: string, userId: string) {
    const booking = await this.prisma.bookings.findFirst({
      where: { 
        id, 
        user_id: userId, 
        is_deleted: false 
      },
      select: this.bookingListSelect(),
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  async cancel(id: string, userId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        status: true,
        is_deleted: true,
      },
    });

    if (!booking || booking.is_deleted) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền huỷ booking này');
    }

    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Chỉ có thể huỷ booking đang chờ thanh toán');
    }

    await this.bookingHoldService.releaseBookingHold(id);

    return this.prisma.bookings.update({
      where: { id },
      data: {
        status: BookingStatus.cancelled,
        //  is_deleted: true,
        //   deleted_by: userId,
        //   deleted_at: new Date(),
        updated_by: userId,
        updated_at: new Date(),
        booking_seats: {
          updateMany: {
            where: { is_deleted: false },
            data: {
              // is_deleted: true, 
              // deleted_by: userId, 
              // deleted_at: new Date(),
              updated_by: userId,
              updated_at: new Date(),
            },
          },
        },
      },
      include: {
        booking_seats: true
      }
    })
  }


}
