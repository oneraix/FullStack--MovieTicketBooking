// token.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from 'src/config/jwt.config';




@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>
  ) {}



  private buildPayload(user: { id: string; email: string; name: string; roles?: { name: string } | null }) {
    return {
      sub: user.id ,
      email: user.email,
      role: user.roles?.name,
      name: user.name,
    };
  }

  async createTokens(user: { id: string; email: string; name: string; roles?: { name: string } | null }) {
    if (!user?.id) {
      throw new Error('Không có userId để tạo token');
    }

    const payload = this.buildPayload(user);

    //Dùng Promise.all để ký 2 token song song (nhanh hơn gấp đôi)
    const [accessToken, refreshToken] = await Promise.all([
      //tạo token
      this.jwt.signAsync(payload, {
        secret: this.jwtCfg.accessTokenSecret,
        expiresIn: this.jwtCfg.accessTokenExpires,
      }),

      //tạo refresh token
      this.jwt.signAsync(payload, {
        secret: this.jwtCfg.refreshTokenSecret,
        expiresIn: this.jwtCfg.refreshTokenExpires,
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
      secret: this.jwtCfg.accessTokenSecret,
    });
    }catch(error){
      throw error;
    }
  }

  async verifyRefreshToken(token: string) {
    try{
    return await this.jwt.verifyAsync(token, {
      secret: this.jwtCfg.refreshTokenSecret,
    });
    }catch(error){
      throw error;
    }
  }


}
