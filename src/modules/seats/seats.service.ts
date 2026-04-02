import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from 'generated/prisma';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) { }

  private async validateForeignKey(roomId?: number, seatTypeId?: number) {
    if (roomId !== undefined) {
      const room = await this.prisma.rooms.findFirst({
        where: {
          id: roomId,
          is_deleted: false
        }
      });
      if (!room) {
        throw new NotFoundException('Phòng chiếu không tồn tại');
      }
    }
    if (seatTypeId !== undefined) {
      const seatType = await this.prisma.seat_types.findFirst({
        where: {
          id: seatTypeId,
          is_deleted: false
        }
      });
      if (!seatType) {
        throw new NotFoundException('Loại ghế không tồn tại');
      }
    }
  }

  private async hasActiveBookingSeat(seatId: number): Promise<boolean> {
    const count = await this.prisma.booking_seats.count({
      where: {
        seat_id: seatId,
        bookings: {
          status: {
            in: [BookingStatus.success, BookingStatus.pending]
          },
          is_deleted: false
        }
      }
    })
    return count > 0
  }

  async create(dto: CreateSeatDto, userId: string) {
    await this.validateForeignKey(dto.room_id, dto.seat_type_id);
    try {
      return await this.prisma.seats.create({
        data: {
          ...dto,
          created_by: userId,
        },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ghế đã tồn tại trong phòng này');
      }
      throw err;
    }
  }

  findAll() {
    return this.prisma.seats.findMany({
      where: { is_deleted: false },
    });
  }

  async findOne(id: number) {
    const seat = await this.prisma.seats.findFirst({
      where: { id, is_deleted: false },
    });
    if (!seat) throw new NotFoundException('Seat not found');
    return seat;
  }

  async update(id: number, dto: UpdateSeatDto, userId: string) {
    await this.findOne(id);
    const dangerousFieldChanged = dto.room_id !== undefined || dto.seat_type_id !== undefined;
    if (dangerousFieldChanged && await this.hasActiveBookingSeat(id)) {
      throw new BadRequestException(
        'Không thể thay đổi phòng hoặc loại ghế khi ghế đang có booking active'
      );
    }
    await this.validateForeignKey(dto.room_id, dto.seat_type_id);
    try {
      return await this.prisma.seats.update({
        where: { id },
        data: {
          ...dto,
          updated_by: userId,
          updated_at: new Date(),
        },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ghế đã tồn tại trong phòng này');
      }
      throw err;
    }
  }

  async softDelete(id: number, userId: string) {
    await this.findOne(id);
    if (await this.hasActiveBookingSeat(id)) {
      throw new BadRequestException(
        'Không thể xoá ghế đang có booking active. Vui lòng xử lý tất cả booking tồn đọng trước.'
      );
    }

    return this.prisma.seats.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });
  }
}
