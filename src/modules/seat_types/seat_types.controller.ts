import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SeatTypesService } from './seat_types.service';
import { CreateSeatTypeDto } from './dto/create-seat_type.dto';
import { UpdateSeatTypeDto } from './dto/update-seat_type.dto';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Controller('seat-types')
export class SeatTypesController {
  constructor(private readonly seatTypesService: SeatTypesService) {}
  @Post()
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateSeatTypeDto,@AuthUser('sub') userId: string) {
    return this.seatTypesService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.seatTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seatTypesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateSeatTypeDto, @AuthUser('sub') userId: string) {
    return this.seatTypesService.update(+id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @AuthUser('sub') userId: string) {
    return this.seatTypesService.softDelete(+id,userId);
  }
}
