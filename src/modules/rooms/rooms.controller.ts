import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Public } from 'src/common/decorator/is-public.decorator';
import { RoomListQueryDto } from './dto/room-list.query.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateRoomDto, @AuthUser('sub') userId: string) {
    return this.roomsService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto, @AuthUser('sub') userId: string) {
    return this.roomsService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number, @AuthUser('sub') userId: string) {
    return this.roomsService.softDelete(id, userId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Get()
  @Public()
  findAll(@Query() query:RoomListQueryDto) {
    return this.roomsService.findAll(query);
  }



}
