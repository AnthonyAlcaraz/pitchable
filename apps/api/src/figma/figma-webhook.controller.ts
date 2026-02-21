import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { FigmaWebhookService } from './figma-webhook.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface RegisterWebhookDto {
  fileKey: string;
  callbackUrl: string;
}

interface FigmaWebhookCallbackBody {
  event_type: string;
  file_key: string;
  file_name: string;
  passcode: string;
  timestamp: string;
  webhook_id: string;
}

@Controller('figma/webhooks')
export class FigmaWebhookController {
  constructor(private readonly webhookService: FigmaWebhookService) {}

  /**
   * Register a Figma webhook for file update events.
   */
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async registerWebhook(
    @Req() req: { user: { userId: string } },
    @Body() body: RegisterWebhookDto,
  ) {
    return this.webhookService.registerWebhook(
      req.user.userId,
      body.fileKey,
      body.callbackUrl,
    );
  }

  /**
   * Figma calls this endpoint when a file is updated.
   * No auth guard — Figma sends the passcode in the payload.
   */
  @Post('callback')
  @HttpCode(200)
  async handleCallback(@Body() body: FigmaWebhookCallbackBody) {
    await this.webhookService.handleCallback(body);
    return { ok: true };
  }

  /**
   * List all registered webhooks for the current user.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listWebhooks(@Req() req: { user: { userId: string } }) {
    return this.webhookService.listWebhooks(req.user.userId);
  }

  /**
   * Deregister a webhook.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deregisterWebhook(
    @Req() req: { user: { userId: string } },
    @Param('id') webhookId: string,
  ) {
    await this.webhookService.deregisterWebhook(webhookId, req.user.userId);
    return { ok: true };
  }
}
