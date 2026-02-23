// bookings.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';

import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './booking.service';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';

 @UseGuards(ProtectGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('user')
  create(@Body() dto: CreateBookingDto, @AuthUser('sub') userId: string) {
    return this.bookingsService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @AuthUser('sub') userId: string) {
    return this.bookingsService.cancel(id,userId);
  }
}
