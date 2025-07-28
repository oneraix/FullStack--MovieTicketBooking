// token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ACCESS_TOKEN_EXPIRES,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_SECRET,
} from 'src/common/constant/app.constant';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  private buildPayload(user: any) {
    return {
      sub: user.id ?? user.userId,
      email: user.email,
      role: user.role ?? user.roles?.name,
      name: user.name,
    };
  }

  createTokens(user: any) {
    if (!user?.id && !user?.userId) {
      throw new Error('Không có userId để tạo token');
    }

    const payload = this.buildPayload(user);

    const accessToken = this.jwt.sign(payload, {
      secret: ACCESS_TOKEN_SECRET,
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: REFRESH_TOKEN_SECRET,
      expiresIn: REFRESH_TOKEN_EXPIRES,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  verifyAccessToken(token: string, ignoreExpiration = false) {
    return this.jwt.verify(token, {
      secret: ACCESS_TOKEN_SECRET,
      ignoreExpiration,
    });
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verify(token, {
      secret: REFRESH_TOKEN_SECRET,
    });
  }
}
