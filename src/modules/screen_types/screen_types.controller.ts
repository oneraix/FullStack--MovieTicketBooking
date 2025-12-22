import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ScreenTypesService } from './screen_types.service';
import { CreateScreenTypeDto } from './dto/create-screen_type.dto';
import { UpdateScreenTypeDto } from './dto/update-screen_type.dto';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';

@Controller('screen-types')
export class ScreenTypesController {
  constructor(private readonly screenTypesService: ScreenTypesService) {}
 @Post()
 @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateScreenTypeDto, @AuthUser('sub') userId: string) {
    return this.screenTypesService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.screenTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.screenTypesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateScreenTypeDto, @AuthUser('sub') userId: string) {
    return this.screenTypesService.update(+id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string,@AuthUser('sub') userId: string) {
    return this.screenTypesService.softDelete(+id, userId);
  }
 
}
