import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ProtectGuard } from './protect/protect.guard';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @Throttle({default:{limit: 5, ttl: 60000}})
  @Post('login')
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @UseGuards(ProtectGuard)
  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return await this.authService.logout(refreshToken);
  }

  @Post('refresh-token')
  refreshToken(@Body() body) {
    return this.authService.refreshAccessToken(body);
  }

}
