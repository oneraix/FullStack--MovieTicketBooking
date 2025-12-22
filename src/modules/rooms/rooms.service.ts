import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  create(dto:CreateRoomDto, userId: string) {
    return this.prisma.rooms.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  update(id:number, dto:UpdateRoomDto, userId: string) {
    return this.prisma.rooms.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

    softDelete(id:number, userId: string){
      return this.prisma.rooms.update({
        where:{id},
        data:{
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        }
      })
    }

    findAll() {
      return this.prisma.rooms.findMany({
        where: {
          is_deleted: false,
        },
        include:{cinemas: true}
      });
    }

    async findOne(id:number){
      const room = await this.prisma.rooms.findFirst({
        
        where:{id, is_deleted: false}
      });
      if(!room){
        throw new NotFoundException('Room not found');
      }
      return room;
    }
}
