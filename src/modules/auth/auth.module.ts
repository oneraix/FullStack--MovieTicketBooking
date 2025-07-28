import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenModule } from '../token/token.module';
import { ProtectStrategy } from './protect/protect.strategy';
import { ProtectGuard } from './protect/protect.guard';

@Module({
  imports: [TokenModule],
  controllers: [AuthController],
  providers: [AuthService, ProtectStrategy, ProtectGuard],
})
export class AuthModule {}
