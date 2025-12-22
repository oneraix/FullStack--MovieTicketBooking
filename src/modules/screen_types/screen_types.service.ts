import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateScreenTypeDto } from './dto/create-screen_type.dto';
import { UpdateScreenTypeDto } from './dto/update-screen_type.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScreenTypesService {
  constructor(private prisma: PrismaService) {}
    create(dto: CreateScreenTypeDto, userId: string) {
    return this.prisma.screen_types.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  findAll() {
    return this.prisma.screen_types.findMany({
      where: { is_deleted: false },
    });
  }

  async findOne(id: number) {
    const screenType = await this.prisma.screen_types.findFirst({
      where: { id, is_deleted: false },
    });
    if (!screenType) throw new NotFoundException('ScreenType not found');
    return screenType;
  }

  async update(id: number, dto: UpdateScreenTypeDto, userId: string) {
    return this.prisma.screen_types.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: number, userId: string) {
    return this.prisma.screen_types.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });
  }
}

