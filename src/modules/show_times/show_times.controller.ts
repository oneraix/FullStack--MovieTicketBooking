import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { UpdateShowTimeDto } from './dto/update-show_time.dto';
import { CreateShowtimeDto } from './dto/create-show_time.dto';
import { ShowtimesService } from './show_times.service';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ShowTimeListQueryDto } from './dto/show-time-list.query.dto';
import { Public } from 'src/common/decorator/is-public.decorator';


@Controller('show-times')
export class ShowTimesController {
  constructor(private readonly showTimesService: ShowtimesService) {}

 @Post()
 @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateShowtimeDto,@AuthUser('sub') userId: string) {
    return this.showTimesService.create(dto,userId);
  }

  @Public()
  @Get(':id/seat-status')
  getSeatStatuses(@Param('id',ParseUUIDPipe) id: string) {
    return this.showTimesService.getSeatStatuses(id);
  }

  @Public()
  @Get()
  findAll(@Query() query: ShowTimeListQueryDto) {
    return this.showTimesService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id',ParseUUIDPipe) id: string) {
    return this.showTimesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards( RolesGuard)
  @Roles('admin')
  update(@Param('id',ParseUUIDPipe) id: string, @Body() dto: UpdateShowTimeDto, @AuthUser('sub') userId: string) {
    return this.showTimesService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards( RolesGuard)
  @Roles('admin')
  remove(@Param('id',ParseUUIDPipe) id: string, @AuthUser('sub') userId: string) {
    return this.showTimesService.softDelete(id, userId);
  }
}
