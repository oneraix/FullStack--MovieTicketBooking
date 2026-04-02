import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Public } from 'src/common/decorator/is-public.decorator';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateCinemaDto, @AuthUser('sub') userId: string) {
    return this.cinemasService.create(dto, userId);
  }

  @Get()
  @Public()
  findAll() {
    return this.cinemasService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cinemasService.findOne(id);
  }

  @Patch(':id')
  @UseGuards( RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCinemaDto, @AuthUser('sub') userId: string) {
    return this.cinemasService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards( RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number, @AuthUser('sub') userId: string) {
    return this.cinemasService.softDelete(id, userId);
  }

}
