import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';

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

  async findAll(query: { genre?: string; search?: string; is_showing?: string }) {
    const { genre, search, is_showing } = query;

    return this.prisma.movies.findMany({
      where: {
        is_deleted: false,
        title: search ? { contains: search, mode: 'insensitive' } : undefined,
        is_showing: is_showing ? is_showing === 'true' : undefined,
        movie_movie_genres: genre
          ? {
              some: {
                movie_genres: {
                  name: {
                    contains: genre,
                    mode: 'insensitive',
                  },
                },
              },
            }
          : undefined,
      },
      include: {
        movie_movie_genres: {
          include: {
            movie_genres: true,
          },
        },
      },
    });
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
    if (genre_ids) {
      await this.prisma.movie_movie_genres.deleteMany({
        where: { movie_id: id },
      });
    }

    return this.prisma.movies.update({
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
