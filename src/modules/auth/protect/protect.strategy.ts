// modules/auth/strategies/protect.strategy.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwtConfig from 'src/config/jwt.config';
import { PrismaService } from 'src/modules/prisma/prisma.service';


@Injectable()
export class ProtectStrategy extends PassportStrategy(Strategy, 'protect') {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,

  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.accessTokenSecret ?? '',
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
