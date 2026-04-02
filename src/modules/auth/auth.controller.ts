import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorator/is-public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('register')
  @Public()
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

 
  @Post('login')
  @Throttle({default:{limit: 5, ttl: 60000}})
  @Public()
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @Post('logout')
  @Public()
  async logout(@Body() body:RefreshTokenDto) {
    return await this.authService.logout(body.refreshToken);
  }

  @Post('refresh-token')
  @Public()
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshAccessToken(body);
  }

}
