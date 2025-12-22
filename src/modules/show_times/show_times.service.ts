import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShowtimeDto } from './dto/create-show_time.dto';
import { UpdateShowTimeDto } from './dto/update-show_time.dto';
import { Cache } from 'cache-manager';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
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
      throw new NotFoundException('Showtime not found');
    }

    const seats = await this.prisma.seats.findMany({
      where: { room_id: showtime.room_id, is_deleted: false },
      select: { id: true, seat_number: true },
    });
    const bookedSeats = await this.prisma.booking_seats.findMany({
      where: {
        bookings: {
          showtime_id: showtimeId,
          status: 'success',
          is_deleted: false,
        },
      },
      select: {
        seat_id: true,
      },
    });
    const bookedSeatIds = bookedSeats.map(seat => seat.seat_id);

    // ✅ Tối ưu check Redis song song
    const heldChecks = await Promise.all(
      seats.map(async seat => {
        const redisKeys = seats.map((seat)=>`hold:${showtimeId}:${seat.id}`);
        const heldValues = await this.redisClient.mget(...redisKeys); 
  // Xác định seat nào đang được giữ (value != null)
  const heldSeatIds = seats
    .filter((seat, index) => heldValues[index] !== null && heldValues[index] !== undefined)
    .map((seat) => seat.id);
        console.log(`📥 Redis GET CHECK: ${redisKeys} = ${result}`);
        return result ? seat.id : null;
      })
    );

    const heldSeatIds = heldChecks.filter((id): id is number => id !== null);

    const result = seats.map((seat) => {
      let status = 'available';
      if (bookedSeatIds.includes(seat.id)) {
        status = 'booked';
      } else if (heldSeatIds.includes(seat.id)) {
        status = 'held';
      }
      console.log('Booked seat ids:', bookedSeatIds);
      console.log('Held seat ids:', heldSeatIds);

      return {
        seat_id: seat.id,
        seat_number: seat.seat_number,
        status,
      };
    });


    return result;
  }




  findAll() {
    return this.prisma.showtimes.findMany({ where: { is_deleted: false } });
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
