import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSeatDto, userId: string) {
    return this.prisma.seats.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
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
    return this.prisma.seats.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: number, userId: string) {
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
