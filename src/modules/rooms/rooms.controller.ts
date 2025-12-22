import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateRoomDto, @AuthUser('sub') userId: string) {
    return this.roomsService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto, @AuthUser('sub') userId: string) {
    return this.roomsService.update(+id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string,@AuthUser('sub') userId: string) {
    return this.roomsService.softDelete(+id, userId);
  }

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(+id);
  }

}
