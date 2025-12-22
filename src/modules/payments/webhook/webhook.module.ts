// src/modules/payments/webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';

@Controller('payments')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;

    if (!rawBody) {
      console.error('❌ Missing raw body for Stripe webhook.');
      return res.status(400).send('Missing raw body');
    }

    try {
      await this.webhookService.handleEvent(sig as string, rawBody);
      return res.send({ received: true });
    } catch (err) {
      console.error('❌ Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
