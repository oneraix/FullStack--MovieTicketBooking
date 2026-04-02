import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MovieListQueryDto } from './dto/movie-list.query.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) { }

  private async hasActiveShowtimes(movieId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.prisma.showtimes.count({
      where: {
        movie_id: movieId,
        is_deleted: false,
        show_date: { gte: today },
      },
    });
    return count > 0;
  }

  private async validateGenreIds(genreIds: number[]): Promise<number[]> {
    const uniqueIds = [...new Set(genreIds)];
    const found = await this.prisma.movie_genres.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((g) => g.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Genre IDs không tồn tại: ${missing.join(', ')}`,
      );
    }
    return uniqueIds;
  }

  async create(dto: CreateMovieDto, userId: string) {
    const { genre_ids, ...movieData } = dto;
    const validGenreIds = await this.validateGenreIds(genre_ids);
    const movie = await this.prisma.movies.create({
      data: {
        ...movieData,
        created_by: userId,
        movie_movie_genres: {
          create: validGenreIds.map((genre_id) => ({
            genre_id,
          })),
        },
      },
      include:{
        movie_movie_genres:{
          include:{
            movie_genres:true
          }
        }
      }
    });

    return movie;
  }

  async findAll(query: MovieListQueryDto) {
    const safePage = query.page ?? 1;
    const safeLimit = query.limit ?? 10;
    const skip = (safePage - 1) * safeLimit;
    const where: Prisma.moviesWhereInput = {
      is_deleted: false,
      is_active:true,
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
    let validGenreIds: number[] | undefined;
    if (genre_ids) {
      validGenreIds = await this.validateGenreIds(genre_ids);
    }
    return this.prisma.$transaction(async (tx) => {
      const existingMovie = await tx.movies.findFirst({
        where: { id, is_deleted: false },
      });
      if (!existingMovie) {
        throw new NotFoundException('Movie not found');
      }
      if (validGenreIds) {
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
          movie_movie_genres: validGenreIds
            ? { create: validGenreIds.map((genre_id) => ({ genre_id })) }
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
    });
  }

  async softDelete(id: string, userId: string) {

    const movie = await this.prisma.movies.findFirst({
      where: { id, is_deleted: false },
    });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    if (await this.hasActiveShowtimes(id)) {
      throw new BadRequestException(
        'Không thể xóa phim đang có suất chiếu. Vui lòng xử lý tất cả suất chiếu trước.',
      );
    }
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
