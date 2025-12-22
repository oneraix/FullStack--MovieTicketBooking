import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatTypeDto } from './dto/create-seat_type.dto';
import { UpdateSeatTypeDto } from './dto/update-seat_type.dto';


@Injectable()
export class SeatTypesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSeatTypeDto, userId: string) {
    return this.prisma.seat_types.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  findAll() {
    return this.prisma.seat_types.findMany({ where: { is_deleted: false } });
  }

  async findOne(id: number) {
    const seatType = await this.prisma.seat_types.findFirst({ where: { id, is_deleted: false } });
    if (!seatType) throw new NotFoundException('Seat type not found');
    return seatType;
  }

  update(id: number, dto: UpdateSeatTypeDto, userId: string) {
    return this.prisma.seat_types.update({
      where: { id },
      data: { ...dto, updated_by: userId, updated_at: new Date() },
    });
  }

  softDelete(id: number, userId: string) {
    return this.prisma.seat_types.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });
  }
}
