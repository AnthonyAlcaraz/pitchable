import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import * as express from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PresentationOwnerGuard } from '../auth/guards/presentation-owner.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post(':presentationId/message')
  @UseGuards(PresentationOwnerGuard)
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('presentationId', ParseUUIDPipe) presentationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: express.Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.chatService.handleMessage(
        user.userId,
        presentationId,
        dto.content,
      )) {
        const data = JSON.stringify(event);
        res.write(`data: ${data}\n\n`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`,
      );
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  @Get(':presentationId/history')
  @UseGuards(PresentationOwnerGuard)
  async getHistory(
    @CurrentUser() _user: RequestUser,
    @Param('presentationId', ParseUUIDPipe) presentationId: string,
  ) {
    return this.chatService.getHistory(presentationId);
  }
}
