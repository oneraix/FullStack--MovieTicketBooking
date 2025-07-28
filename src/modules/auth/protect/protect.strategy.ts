// modules/auth/strategies/protect.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN_SECRET } from 'src/common/constant/app.constant';
import { PrismaService } from 'src/modules/prisma/prisma.service';


@Injectable()
export class ProtectStrategy extends PassportStrategy(Strategy, 'protect') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ACCESS_TOKEN_SECRET ?? '',
    });
  }

async validate(payload: any) {
  const user = await this.prisma.users.findUnique({
    where: { id: payload.sub },
    include: { roles: true },
  });

  if (!user || user.is_deleted || !user.is_active) {
    throw new UnauthorizedException('Tài khoản không hợp lệ');
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.roles?.name, // hoặc payload.role nếu không cần cập nhật DB
    name: user.name,
  };
}

}
