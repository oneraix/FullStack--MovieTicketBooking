import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';


@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.moviesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }

  @Post()
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateMovieDto, @AuthUser('sub') userId: string) {
    return this.moviesService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateMovieDto, @AuthUser('sub') userId: string) {
    return this.moviesService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string,@AuthUser('sub') userId: string) {
    return this.moviesService.softDelete(id, userId);
  }
}
