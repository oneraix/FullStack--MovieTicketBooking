import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from 'generated/prisma';

@Injectable()
export class CinemasService {
  constructor (private prisma: PrismaService) {}

private async hasActiveDependencies(cinemaId: number): Promise<boolean> {
  const activeBookingCount = await this.prisma.bookings.count({
    where: {
      showtimes: {
        rooms: {                
          cinema_id: cinemaId,   
          is_deleted: false,
        },
        is_deleted: false,
      },
      status: { in: [BookingStatus.success, BookingStatus.pending] },
      is_deleted: false,
    },
  });
  return activeBookingCount > 0;
}

  async create(dto: CreateCinemaDto, userId:string){
    return this.prisma.cinemas.create({
      data:{
        ...dto,
        created_by: userId
      },
    });
  }

  findAll(){
    return this.prisma.cinemas.findMany({
      where: {
        is_deleted: false
      }
    });
  }


  async findOne(id:number){
    const cinema = await this.prisma.cinemas.findFirst({
      where:{id, is_deleted: false}
    });
    if(!cinema){
      throw new NotFoundException('Cinema not found');
    }
    return cinema;
  }

  async update(id:number, dto:UpdateCinemaDto, userId:string){
    await this.findOne(id);
    return this.prisma.cinemas.update({
      where:{id},
      data:{...dto,
        updated_by: userId,
        updated_at: new Date(),
      }
    })
  }

async softDelete(id: number, userId: string) {
  await this.findOne(id);
  if (await this.hasActiveDependencies(id)) {
    throw new BadRequestException(
      'Không thể xoá rạp đang có booking active. Vui lòng xử lý tất cả booking tồn đọng trước.'
    );
  }
  // Lấy danh sách room_ids thuộc cinema này
  const rooms = await this.prisma.rooms.findMany({
    where: { cinema_id: id, is_deleted: false },
    select: { id: true },
  });
  const roomIds = rooms.map((r) => r.id);
  return this.prisma.$transaction(async (tx) => {
    if (roomIds.length > 0) {
      // 1. Soft-delete tất cả seats thuộc các rooms
      await tx.seats.updateMany({
        where: { room_id: { in: roomIds }, is_deleted: false },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });
      // 2. Soft-delete tất cả showtimes thuộc các rooms
      await tx.showtimes.updateMany({
        where: { room_id: { in: roomIds }, is_deleted: false },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });
      // 3. Soft-delete tất cả rooms thuộc cinema
      await tx.rooms.updateMany({
        where: { cinema_id: id, is_deleted: false },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });
    }
    // 4. Soft-delete cinema
    return tx.cinemas.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });
  });
}
}
