import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from 'src/common/stripe/stripe.module';
import { WebhookController } from './webhook/webhook.controller';
import { WebhookService } from './webhook/webhook.service';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, WebhookService],
})
export class PaymentsModule { }
