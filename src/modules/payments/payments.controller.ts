import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import { PaymentListQueryDto } from './dto/payment-list.query.dto';

@UseGuards(RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Get()
  @Roles('admin')
  findAll(@Query() query: PaymentListQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Post('checkout')
  @Roles('user')
  createCheckout(@Body() dto: CreatePaymentDto, @AuthUser('sub') userId: string) {
    return this.paymentsService.createCheckoutSession(dto, userId);
  }

  @Get('checkout')
  @Roles('user')
  getCheckoutSession(
    @Query('session_id') sessionId: string,
    @AuthUser('sub') userId: string,
  ) {
    return this.paymentsService.getCheckoutSessionStatus(sessionId, userId)
  }


  @Get('me')
  @Roles('user')
  findMyPayments(@AuthUser('sub') userId: string) {
    return this.paymentsService.findMyPayments(userId);
  }
  @Get(':id')
  @Roles('user')
  findOne(
    @Param('id') id: string,
    @AuthUser('sub') userId: string
  ) {
    return this.paymentsService.findOne(id, userId);
  }

}
