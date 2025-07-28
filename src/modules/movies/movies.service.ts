import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMovieDto, userId: string) {
    return this.prisma.movies.create({
      data: {
        ...dto,
        created_by: userId,
      },
    });
  }

  async findAll(query: { genre?: string; search?: string; is_showing?: string }) {
    const { genre, search, is_showing } = query;

    return this.prisma.movies.findMany({
      where: {
        is_deleted: false,
        genre: genre ? { contains: genre, mode: 'insensitive' } : undefined,
        title: search ? { contains: search, mode: 'insensitive' } : undefined,
        is_showing: is_showing ? is_showing === 'true' : undefined,
      },
    });
  }

  async findOne(id: string) {
    const movie = await this.prisma.movies.findFirst({ where: { id, is_deleted: false } });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  async update(id: string, dto: UpdateMovieDto, userId: string) {
    return this.prisma.movies.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: string, userId: string) {
    return this.prisma.movies.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }
}
