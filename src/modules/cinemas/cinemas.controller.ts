import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Post()
    @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateCinemaDto, @AuthUser('sub') userId: string) {
    return this.cinemasService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.cinemasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cinemasService.findOne(+id);
  }

  @Patch(':id')
    @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id:string,@Body()dto:UpdateCinemaDto, @AuthUser('sub') userId: string) {
    return this.cinemasService.update(+id, dto, userId);
  }

  @Delete(':id')
    @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string,@AuthUser('sub') userId: string) {
    return this.cinemasService.softDelete(+id, userId);
  }

}
