import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../token/token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis
  ) { }

  async register(body: RegisterDto) {
    const { email, name, password, phone } = body;

    const existingUser = await this.prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email này đã được đăng ký');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.users.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role_id: true,
      },
    });

    return user;
  }

  async login(body: LoginDto) {
    const { email, password } = body;

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user || user.is_deleted || !user.is_active) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu không hợp lệ');
    }

    return this.tokenService.createTokens(user);
  }

  private getBlacklistKey(token: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    return `blacklist:${hash}`;
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.tokenService.verifyRefreshToken(refreshToken);
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(decoded.exp - now, 0);
      if (ttl > 0) {
        const key = this.getBlacklistKey(refreshToken);
        await this.redisClient.set(key, '1', 'EX', ttl);
      }
    } catch { }
  }

  async refreshAccessToken(body: { refreshToken: string }) {
    const { refreshToken } = body;
    const key = this.getBlacklistKey(refreshToken);
    const isBlacklisted = await this.redisClient.get(key);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token đã bị thu hồi');
    }
    try {
      const decoded = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.prisma.users.findUnique({
        where: { id: decoded.sub },
        include: { roles: true },
      });

      if (!user || !user.is_active || user.is_deleted) {
        throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khoá');
      }

      return this.tokenService.createTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }
}
