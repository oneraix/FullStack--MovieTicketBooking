import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserListQueryDto } from './dto/user-list.query.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // Selector dùng chung — không bao giờ trả password ra ngoài
  private userSelect(): Prisma.usersSelect {
    return {
      id: true, name: true, email: true, phone: true,
      avatar: true, role_id: true, is_active: true,
      created_at: true, updated_at: true,
      roles: { select: { id: true, name: true } },
    };
  }

  // USER: lấy profile
  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId, is_deleted: false },
      select: this.userSelect(),
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  // USER: cập nhật profile
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.getProfile(userId); // kiểm tra tồn tại
    return this.prisma.users.update({
      where: { id: userId },
      data: { ...dto, updated_at: new Date(), updated_by: userId },
      select: this.userSelect(),
    });
  }

  // USER: đổi mật khẩu
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId, is_deleted: false },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.users.update({
      where: { id: userId },
      data: { password: hashed, updated_at: new Date(), updated_by: userId },
    });
    return { message: 'Đổi mật khẩu thành công' };
  }

  // ADMIN: danh sách user có phân trang + tìm kiếm
  async findAll(query: UserListQueryDto) {
    const safePage  = query.page  ?? 1;
    const safeLimit = query.limit ?? 10;
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.usersWhereInput = {
      is_deleted: false,
      ...(query.search?.trim() && {
        OR: [
          { name:  { contains: query.search.trim(), mode: 'insensitive' } },
          { email: { contains: query.search.trim(), mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where, select: this.userSelect(),
        orderBy: { created_at: 'desc' },
        skip, take: safeLimit,
      }),
      this.prisma.users.count({ where }),
    ]);

    return {
      items,
      pagination: { page: safePage, limit: safeLimit, total,
        total_pages: Math.ceil(total / safeLimit) },
    };
  }

  // ADMIN: lấy chi tiết 1 user
  async findOne(id: string) {
    const user = await this.prisma.users.findFirst({
      where: { id, is_deleted: false },
      select: this.userSelect(),
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  // ADMIN: khoá / mở khoá
  async toggleStatus(id: string, adminId: string) {
    const user = await this.prisma.users.findFirst({
      where: { id, is_deleted: false },
      select: { id: true, is_active: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    return this.prisma.users.update({
      where: { id },
      data: { is_active: !user.is_active, updated_at: new Date(), updated_by: adminId },
      select: this.userSelect(),
    });
  }
}
