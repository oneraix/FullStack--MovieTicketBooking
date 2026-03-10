import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShowtimeDto } from './dto/create-show_time.dto';
import { UpdateShowTimeDto } from './dto/update-show_time.dto';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
import { BookingStatus, Prisma } from 'generated/prisma';
import { ShowTimeListQueryDto } from './dto/show-time-list.query.dto';

//import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ShowtimesService {
  constructor(private prisma: PrismaService,
    @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis,
  ) { }

  create(dto: CreateShowtimeDto, userId: string) {
    return this.prisma.showtimes.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  async getSeatStatuses(showtimeId: string) {
    const showtime = await this.prisma.showtimes.findUnique({
      where: { id: showtimeId },
      select: { room_id: true },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime không tồn tại');
    }

    if (!showtime.room_id) {
      throw new BadRequestException('Showtime chưa được gán phòng chiếu');
    }

    const seats = await this.prisma.seats.findMany({
      where: {
        room_id: showtime.room_id,
        is_deleted: false,
      },
      select: {
        id: true,
        seat_number: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const bookedSeats = await this.prisma.booking_seats.findMany({
      where: {
        bookings: {
          showtime_id: showtimeId,
          status: BookingStatus.success,
          is_deleted: false,
        },
      },
      select: {
        seat_id: true,
      },
    });

    const bookedSeatIdSet = new Set(
      bookedSeats
        .map((seat) => seat.seat_id)
        .filter((id): id is number => id !== null),
    );

    const redisKeys = seats.map((seat) => `hold:${showtimeId}:${seat.id}`);
    const heldValues = redisKeys.length
      ? await this.redisClient.mget(...redisKeys)
      : [];

    const heldSeatIdSet = new Set(
      seats
        .filter((seat, index) => heldValues[index] !== null && heldValues[index] !== undefined)
        .map((seat) => seat.id),
    );

    return seats.map((seat) => {
      let status: 'available' | 'held' | 'booked' = 'available';

      if (bookedSeatIdSet.has(seat.id)) {
        status = 'booked';
      } else if (heldSeatIdSet.has(seat.id)) {
        status = 'held';
      }

      return {
        seat_id: seat.id,
        seat_number: seat.seat_number,
        status,
      };
    });
  }


  async findAll(query: ShowTimeListQueryDto) {
    const safePage = query.page ?? 1;
    const safeLimit = query.limit ?? 10;
    const skip = (safePage - 1) * safeLimit;

    const where:Prisma.showtimesWhereInput = {
      is_deleted: false,
      ...(query.movie_id && { movie_id: query.movie_id }),
      ...(query.show_date && { show_date: new Date(`${query.show_date}T00:00:00.000Z`) }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.showtimes.findMany({
        where,
        include: {
          movies: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            }
          },
          rooms: {
            select: {
              id: true,
              name: true,
              cinemas: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
        orderBy: [{show_date: 'asc'}, {show_time: 'asc'}],
        skip,
        take: safeLimit,
      }),
      this.prisma.showtimes.count({where})
    ]);
    return{
      items,
      pagination:{
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit)
      }
    }
  }

  async findOne(id: string) {
    const showtime = await this.prisma.showtimes.findFirst({ where: { id, is_deleted: false } });
    if (!showtime) throw new NotFoundException('Showtime not found');
    return showtime;
  }

  update(id: string, dto: UpdateShowTimeDto, userId: string) {
    return this.prisma.showtimes.update({
      where: { id },
      data: { ...dto, updated_by: userId, updated_at: new Date() },
    });
  }

  softDelete(id: string, userId: string) {
    return this.prisma.showtimes.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });
  }
}
