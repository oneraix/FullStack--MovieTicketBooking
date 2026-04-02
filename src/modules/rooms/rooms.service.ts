import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from 'generated/prisma';
import { RoomListQueryDto } from './dto/room-list.query.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) { }

  private async validateForeignKey(roomId?: number, seatTypeId?: number) {
    if (roomId !== undefined) {
      const room = await this.prisma.cinemas.findFirst({
        where: {
          id: roomId,
          is_deleted: false
        }
      });
      if (!room) {
        throw new NotFoundException('Phong chieu khong ton tai');
      }
    }
    if (seatTypeId !== undefined) {
      const seatType = await this.prisma.screen_types.findFirst({
        where: {
          id: seatTypeId,
          is_deleted: false
        }
      });
      if (!seatType) {
        throw new NotFoundException('Loai ghe khong ton tai');
      }
    }
  }

  private async hasActiveDependencies(roomId: number): Promise<boolean> {
    const activeBookingCount = await this.prisma.bookings.count({
      where: {
        showtimes: {
          room_id: roomId,
          is_deleted: false
        },
        status: {
          in: [BookingStatus.success, BookingStatus.pending]
        },
        is_deleted: false
      }
    });
    return activeBookingCount > 0;
  }

  async create(dto: CreateRoomDto, userId: string) {
    await this.validateForeignKey(dto.cinema_id);
    return this.prisma.rooms.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  async update(id: number, dto: UpdateRoomDto, userId: string) {
    await this.findOne(id);
    await this.validateForeignKey(dto.cinema_id);
    return this.prisma.rooms.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: number, userId: string) {
    await this.findOne(id);
    if (await this.hasActiveDependencies(id)) {
      throw new BadRequestException('Không thể xoá phòng chiếu đang có booking. Vui lòng xử lý tất cả booking tồn động trước.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.seats.updateMany({
        where: {
          room_id: id,
          is_deleted: false
        },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date()
        },
      });

      await tx.showtimes.updateMany({
        where: {
          room_id: id,
          is_deleted: false
        },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date()
        },
      });

      return tx.rooms.update({
        where: {
          id,
        },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date()
        }
      })
    })
  }


async findAll(query: RoomListQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {
    is_deleted: false,
    ...(query.cinema_id && { cinema_id: query.cinema_id }),
    ...(query.screen_type_id && { screen_type_id: query.screen_type_id }),
  };

  const [items, total] = await this.prisma.$transaction([
    this.prisma.rooms.findMany({
      where,
      include: { cinemas: true },
      skip,
      take: limit,
      orderBy: { id: 'asc' },
    }),
    this.prisma.rooms.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}


  async findOne(id: number) {
    const room = await this.prisma.rooms.findFirst({

      where: { id, is_deleted: false }
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}
