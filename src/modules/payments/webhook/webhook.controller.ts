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
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';


@Controller('payments')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(private readonly webhookService: WebhookService) { }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Khong co rawbody')
      return res.status(400).send('Không tìm thấy raw body');
    }

    try {
      await this.webhookService.handleEvent(sig as string, rawBody);
      return res.send({ received: true });
    } catch (err) {
      const message = err instanceof Error? err.message : 'Unknown error';
      this.logger.error('lỗi xử lí webhook: ', message)
      return res.status(400).send(`Webhook Error: ${message}`);
    }
  }
  
}
