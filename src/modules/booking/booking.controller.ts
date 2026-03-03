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
  Query,
} from '@nestjs/common';

import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './booking.service';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { BookingListQueryDto } from './dto/booking-list.query.dto';

@UseGuards(ProtectGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('user')
  create(@Body() dto: CreateBookingDto, @AuthUser('sub') userId: string) {
    return this.bookingsService.create(dto, userId);
  }

  @Get('me')
  @Roles('user')
  findMyBookings(
    @AuthUser('sub') userId: string,
    @Query() query: BookingListQueryDto,
  ) {
    return this.bookingsService.findMyBookings(userId, query);
  }

  @Get('me/:id')
  @Roles('user')
  findMyBooking(
    @Param('id') id: string,
    @AuthUser('sub') userId: string,
  ) {
    return this.bookingsService.findMyBooking(id, userId);
  }

  @Delete(':id')
  @Roles('user')
  cancel(@Param('id') id: string, @AuthUser('sub') userId: string) {
    return this.bookingsService.cancel(id,userId);
  }

//Admin
  @Get()
  @Roles('admin')
  findAllForAdmin(@Query() query: BookingListQueryDto) {
    return this.bookingsService.findAllForAdmin(query);
  }

  @Get(':id')
  @Roles('admin')
  findOneForAdmin(@Param('id') id: string) {
    return this.bookingsService.findOneForAdmin(id);
  }


}
