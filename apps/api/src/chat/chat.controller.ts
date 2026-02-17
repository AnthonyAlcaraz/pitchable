import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PresentationOwnerGuard } from '../auth/guards/presentation-owner.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import {
  PresentationType,
  PresentationStatus,
} from '../../generated/prisma/enums.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':presentationId/message')
  @UseGuards(PresentationOwnerGuard)
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('presentationId') rawPresentationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: express.Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let presentationId = rawPresentationId;

    // Auto-create presentation when frontend sends "new"
    if (presentationId === 'new') {
      try {
        const defaultTheme = await this.prisma.theme.findUnique({
          where: { name: 'pitchable-dark' },
          select: { id: true },
        });
        const themeId = defaultTheme?.id ?? (
          await this.prisma.theme.findFirst({ where: { isBuiltIn: true }, select: { id: true } })
        )?.id;

        if (!themeId) {
          res.write(`data: ${JSON.stringify({ type: 'error', content: 'No themes available. Please seed the database.' })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        // Find user's default Pitch Lens (most recent)
        const defaultLens = await this.prisma.pitchLens.findFirst({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        const pres = await this.prisma.presentation.create({
          data: {
            title: 'Untitled',
            sourceContent: '',
            presentationType: PresentationType.STANDARD,
            status: PresentationStatus.DRAFT,
            themeId,
            imageCount: 0,
            userId: user.userId,
            pitchLensId: defaultLens?.id ?? null,
          },
        });
        presentationId = pres.id;

        // Tell the frontend about the new presentation ID so it can update the URL
        res.write(`data: ${JSON.stringify({ type: 'action', content: 'Presentation created', metadata: { action: 'presentation_created', presentationId } })}\n\n`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to create presentation';
        res.write(`data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }

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
    @Param('presentationId') presentationId: string,
  ) {
    // Return empty history for new presentations
    if (presentationId === 'new') {
      return [];
    }
    return this.chatService.getHistory(presentationId);
  }
}
