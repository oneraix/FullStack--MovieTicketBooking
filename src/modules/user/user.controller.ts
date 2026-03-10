import { Controller, Get, Patch, Param, Body, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserListQueryDto } from './dto/user-list.query.dto';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';

@UseGuards(ProtectGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Roles('user', 'admin')
  getProfile(@AuthUser('sub') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Patch('me')
  @Roles('user', 'admin')
  updateProfile(@AuthUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Patch('me/password')
  @Roles('user', 'admin')
  changePassword(@AuthUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto);
  }

  @Get()
  @Roles('admin')
  findAll(@Query() query: UserListQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id',ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin')
  toggleStatus(@Param('id',ParseUUIDPipe) id: string, @AuthUser('sub') adminId: string) {
    return this.userService.toggleStatus(id, adminId);
  }
}
