import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShowtimeDto } from './dto/create-show_time.dto';
import { UpdateShowTimeDto } from './dto/update-show_time.dto';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
import { BookingStatus, Prisma } from 'generated/prisma';
import { ShowTimeListQueryDto } from './dto/show-time-list.query.dto';
import appConfig from 'src/config/app.config';
import { ConfigType } from '@nestjs/config';


//import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ShowtimesService {
  constructor(private prisma: PrismaService,
    @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) { }

  private timeToMinutes(time: Date): number {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
  }

  private isOverlapping(
    startA: number, durationA: number,
    startB: number, durationB: number,
  ): boolean {
    const endA = startA + durationA;
    const endB = startB + durationB;
    return startA < endB && endA > startB;
  }

  private async checkScheduleConflict(
    roomId: number,
    showDate: string | Date,
    showTime: string | Date,
    movieDuration: number | null,
    excludeId?: string,
  ) {
    const existingShowtimes = await this.prisma.showtimes.findMany({
      where: {
        room_id: roomId,
        show_date: new Date(showDate),
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } })
      },
      select: {
        id: true,
        show_time: true,
        movies: {
          select: {
            duration: true,
            title: true
          }
        }
      }
    });
    const newStartMinutes = this.timeToMinutes(new Date(showTime));
    const newDuration = movieDuration ?? this.appCfg.showtime_default_duration;
    const newOccupied = newDuration + this.appCfg.showtime_buffer_duration

    for (const existing of existingShowtimes) {
      const existingStart = this.timeToMinutes(existing.show_time);
      const existingDuration = existing.movies?.duration ?? this.appCfg.showtime_default_duration;
      const existingOccupied = existingDuration + this.appCfg.showtime_buffer_duration;

      if (this.isOverlapping(newStartMinutes, newOccupied, existingStart, existingOccupied)) {
        const existongTimeStr = existing.show_time.toISOString().substring(11, 16);
        throw new BadRequestException(`Xung đột lịch chiếu: phòng đã suất chiếu lúc ${existongTimeStr}` + `(ID:${existing.id})`);
      }
    }
  }

  private async validateMovieAndRoom(movieId: string, roomId: number) {
    const movie = await this.prisma.movies.findFirst({
      where: {
        id: movieId,
        is_deleted: false,
      }
    });
    if (!movie) {
      throw new NotFoundException('Phim không tồn tại hoặc đã bị xoá');
    }
    const room = await this.prisma.rooms.findFirst({
      where: {
        id: roomId,
        is_deleted: false,
      }
    });
    if (!room) {
      throw new NotFoundException('Phòng chiếu không tồn tại hoặc đã bị xoá');
    }
    return { movie, room };
  }

  private async hasActiveBookings(showtimeId: string): Promise<boolean> {
    const count = await this.prisma.bookings.count({
      where: {
        showtime_id: showtimeId,
        status: { in: [BookingStatus.success, BookingStatus.pending] },
        is_deleted: false,
      },
    });

    return count > 0;
  }

  async create(dto: CreateShowtimeDto, userId: string) {
    const { movie } = await this.validateMovieAndRoom(dto.movie_id, dto.room_id);
    return this.prisma.$transaction(async (tx) => {
      await this.checkScheduleConflict(
        dto.room_id,
        dto.show_date,
        dto.show_time,
        movie.duration
      );
      return tx.showtimes.create({
        data: {
          ...dto,
          created_by: userId,
        }
      })
    })
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
          status: { in: [BookingStatus.success, BookingStatus.pending] },
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

    const where: Prisma.showtimesWhereInput = {
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
        orderBy: [{ show_date: 'asc' }, { show_time: 'asc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.showtimes.count({ where })
    ]);
    return {
      items,
      pagination: {
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

  async update(id: string, dto: UpdateShowTimeDto, userId: string) {
    const existing = await this.prisma.showtimes.findFirst({
      where: {
        id,
        is_deleted: false
      },
      include: {
        movies: {
          select: {
            duration: true
          }
        }
      }
    });
    if (!existing) {
      throw new NotFoundException('Suất chiếu không tồn tại');
    }

    const dangerousFieldChanged = dto.room_id !== undefined || dto.show_date !== undefined || dto.show_time !== undefined;

    if (dangerousFieldChanged && await this.hasActiveBookings(id)) {
      throw new BadRequestException('Không thể thay đổi thông tin suất chiếu khi đã có booking. Vui lòng xử lý tất cả booking tồn đọng trước')
    }

    const movieId = dto.movie_id ?? existing.movie_id;
    const roomId = dto.room_id ?? existing.room_id;
    const showDate = dto.show_date ?? existing.show_date;
    const showTime = dto.show_time ?? existing.show_time;
    let movieDuration = existing.movies?.duration ?? null;

    if (movieId && roomId) {
      const { movie } = await this.validateMovieAndRoom(movieId, roomId);
      movieDuration = movie.duration
    }

    if (dangerousFieldChanged && roomId) {
      await this.checkScheduleConflict(roomId, showDate, showTime, movieDuration, id);
    }

    return this.prisma.showtimes.update({
      where: { id },
      data: { ...dto, updated_by: userId, updated_at: new Date() },
    });
  }

  async softDelete(id: string, userId: string) {
    const existing = await this.prisma.showtimes.findFirst({
      where: {
        id,
        is_deleted: false
      },
    });
    if (!existing) {
      throw new BadRequestException('Suất chiếu không tồn tại');
    }
    if(await this.hasActiveBookings(id)){
      throw new BadRequestException('Không thể xóa suất chiếu khi đã có booking.' + 'Vui lòng xử lý tất cả booking tồn đọng trước');
    }
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
