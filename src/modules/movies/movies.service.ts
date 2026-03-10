import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MovieListQueryDto } from './dto/movie-list.query.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMovieDto, userId: string) {
    const { genre_ids, ...movieData } = dto;

    const movie = await this.prisma.movies.create({
      data: {
        ...movieData,
        created_by: userId,
        movie_movie_genres: {
          create: genre_ids.map((genre_id) => ({
            genre_id,
          })),
        },
      },
    });

    return movie;
  }

async findAll(query: MovieListQueryDto) {
  const safePage  = query.page  ?? 1;
  const safeLimit = query.limit ?? 10;
  const skip = (safePage - 1) * safeLimit;
  const where: Prisma.moviesWhereInput = {
    is_deleted: false,
    ...(query.search && { title: { contains: query.search, mode: 'insensitive' } }),
    ...(query.is_showing !== undefined && { is_showing: query.is_showing }),
    ...(query.genre && {
      movie_movie_genres: {
        some: { movie_genres: { name: { contains: query.genre, mode: 'insensitive' } } },
      },
    }),
  };
  const [items, total] = await this.prisma.$transaction([
    this.prisma.movies.findMany({
      where,
      include: { movie_movie_genres: { include: { movie_genres: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
    }),
    this.prisma.movies.count({ where }),
  ]);
  return {
    items,
    pagination: { page: safePage, limit: safeLimit, total, total_pages: Math.ceil(total / safeLimit) },
  };
}

  async findOne(id: string) {
    const movie = await this.prisma.movies.findFirst({
      where: { id, is_deleted: false },
      include: {
        movie_movie_genres: {
          include: {
            movie_genres: true,
          },
        },
      },
    });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  async update(id: string, dto: UpdateMovieDto, userId: string) {
    const { genre_ids, ...movieData } = dto;

    // Kiểm tra movie có tồn tại không
    const existingMovie = await this.prisma.movies.findUnique({ where: { id } });
    if (!existingMovie || existingMovie.is_deleted) throw new NotFoundException('Movie not found');

    // Nếu có cập nhật genre thì xóa trước rồi tạo lại
    return this.prisma.$transaction(async(tx) =>{//add: wrap transaction tránh mất data khi crash
    if (genre_ids) {
      await tx.movie_movie_genres.deleteMany({
        where: { movie_id: id },
      });
    }

    return tx.movies.update({
      where: { id },
      data: {
        ...movieData,
        updated_by: userId,
        updated_at: new Date(),
        movie_movie_genres: genre_ids
          ? {
              create: genre_ids.map((genre_id) => ({
                genre_id,
              })),
            }
          : undefined,
      },
    });
  }
)}

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
