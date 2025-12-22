import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';

import { UpdateShowTimeDto } from './dto/update-show_time.dto';
import { CreateShowtimeDto } from './dto/create-show_time.dto';
import { ShowtimesService } from './show_times.service';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';


@Controller('show-times')
export class ShowTimesController {
  constructor(private readonly showTimesService: ShowtimesService) {}

 @Post()
 @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateShowtimeDto,@AuthUser('sub') userId: string) {
    return this.showTimesService.create(dto,userId);
  }

  @Get(':id/seat-status')
  getSeatStatuses(@Param('id') id: string) {
    return this.showTimesService.getSeatStatuses(id);
  }

  @Get()
  findAll() {
    return this.showTimesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showTimesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateShowTimeDto, @AuthUser('sub') userId: string) {
    return this.showTimesService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @AuthUser('sub') userId: string) {
    return this.showTimesService.softDelete(id, userId);
  }
}
