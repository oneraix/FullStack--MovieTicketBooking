import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}
   
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateSeatDto, @AuthUser('sub') userId:string) {
    return this.seatsService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.seatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number) {
    return this.seatsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id',ParseIntPipe) id: string, @Body() dto: UpdateSeatDto, @AuthUser('sub') userId:string) {
    return this.seatsService.update(+id, dto, userId);
  }

  @Delete(':id')
  @UseGuards( RolesGuard)
  @Roles('admin')
  remove(@Param('id',ParseIntPipe) id: string,@AuthUser('sub') userId: string) {
    return this.seatsService.softDelete(+id,userId);
  }
}
