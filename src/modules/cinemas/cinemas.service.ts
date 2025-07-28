import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from 'rxjs';
import { useRevalidator } from 'react-router-dom';

@Injectable()
export class CinemasService {
  constructor (private prisma: PrismaService) {}

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
    return this.prisma.cinemas.update({
      where:{id},
      data:{...dto,
        updated_by: userId,
        updated_at: new Date(),
      }
    })
  }

  async softDelete(id:number, userId:string){
    return this.prisma.cinemas.update({
      where :{id},
      data:{
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),

      }
    })
  }

}
