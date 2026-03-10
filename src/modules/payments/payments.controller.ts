import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { ProtectGuard } from '../auth/protect/protect.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { PaymentListQueryDto } from './dto/payment-list.query.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Get()
  @Roles('admin')
  @UseGuards(ProtectGuard, RolesGuard)
  findAll(@Query() query: PaymentListQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Post('checkout')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('user')
  createCheckout(@Body() dto: CreatePaymentDto, @AuthUser('sub') userId: string) {
    return this.paymentsService.createCheckoutSession(dto, userId);
  }

  @Get('checkout')
  @UseGuards(ProtectGuard, RolesGuard)
  @Roles('user')
  getCheckoutSession(
    @Query('session_id') sessionId: string,
    @AuthUser('sub') userId: string,
  ) {
    return this.paymentsService.getCheckoutSessionStatus(sessionId, userId)
  }
}
