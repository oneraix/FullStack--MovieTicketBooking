// token.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { 
  ACCESS_TOKEN_EXPIRES,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_SECRET,
} from 'src/common/constant/app.constant';
import jwtConfig from 'src/config/jwt.config';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>
  ) {}

  private buildPayload(user: any) {
    return {
      sub: user.id ?? user.userId,
      email: user.email,
      role: user.role ?? user.roles?.name,
      name: user.name,
    };
  }

  async createTokens(user: any) {
    if (!user?.id && !user?.userId) {
      throw new Error('Không có userId để tạo token');
    }

    const payload = this.buildPayload(user);

    //Dùng Promise.all để ký 2 token song song (nhanh hơn gấp đôi)
    const [accessToken, refreshToken] = await Promise.all([
      //tạo token
      this.jwt.signAsync(payload, {
        secret: this.config.accessTokenSecret,
        expiresIn: this.config.accessTokenExpires,
      }),

      //tạo refresh token
      this.jwt.signAsync(payload, {
        secret: this.config.refreshTokenSecret,
        expiresIn: this.config.refreshTokenExpires,
      })
    ]);


    return {
      accessToken,
      refreshToken,
    };
  }

   async verifyAccessToken(token: string) {
    try{
    return await this.jwt.verifyAsync(token, {
      secret: this.config.accessTokenSecret,
    });
    }catch(error){
      throw error;
    }
  }

  async verifyRefreshToken(token: string) {
    try{
    return await this.jwt.verifyAsync(token, {
      secret: this.config.refreshTokenSecret,
    });
    }catch(error){
      throw error;
    }
  }
}
