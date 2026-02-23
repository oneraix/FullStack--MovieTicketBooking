import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post('checkout')
  @UseGuards(ProtectGuard, RolesGuard)
  createCheckout(@Body() dto: CreatePaymentDto, @AuthUser('sub') userId: string) {
    return this.paymentsService.createCheckoutSession(dto, userId);
  }
  getCheckoutSession(
    @Query('session_id') sessionId: string,
    @AuthUser('sub') userId:string,
  ){
    return this.paymentsService.getCheckoutSessionStatus(sessionId,userId)
  }
}
