import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  Logger,
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

/** Max time (ms) a SSE stream can be idle before we close it. */
const SSE_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Heartbeat interval (ms) to keep SSE alive through proxies (Cloudflare, Railway). */
const SSE_HEARTBEAT_MS = 20_000; // 20 seconds

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

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

    // Track client disconnect to abort generation early
    let clientDisconnected = false;
    res.on('close', () => { clientDisconnected = true; });

    // Heartbeat: send SSE comment every 20s to prevent proxy idle timeout
    // (Cloudflare kills HTTP/2 connections idle >100s with ERR_HTTP2_PROTOCOL_ERROR)
    const heartbeat = setInterval(() => {
      if (!clientDisconnected && res.writable) {
        try { res.write(': keepalive\n\n'); } catch { /* ignore */ }
      }
    }, SSE_HEARTBEAT_MS);

    // Idle timeout: close stream if no events sent for too long
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!clientDisconnected) {
          this.logger.warn(`SSE idle timeout for presentation ${presentationId}`);
          try { res.write('data: [DONE]\n\n'); res.end(); } catch { /* already closed */ }
        }
      }, SSE_IDLE_TIMEOUT_MS);
    };
    resetIdle();

    try {
      for await (const event of this.chatService.handleMessage(
        user.userId,
        presentationId,
        dto.content,
      )) {
        // Backpressure: stop writing if client disconnected or stream not writable
        if (clientDisconnected || !res.writable) {
          this.logger.debug(`SSE stream closed by client for presentation ${presentationId}`);
          break;
        }
        const data = JSON.stringify(event);
        res.write(`data: ${data}\n\n`);
        resetIdle();
      }
    } catch (error) {
      if (!clientDisconnected && res.writable) {
        const msg =
          error instanceof Error ? error.message : 'Unknown error';
        res.write(
          `data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`,
        );
      }
    }

    clearInterval(heartbeat);
    if (idleTimer) clearTimeout(idleTimer);

    if (!clientDisconnected && res.writable) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  @Get(':presentationId/history')
  @UseGuards(PresentationOwnerGuard)
  async getHistory(
    @CurrentUser() _user: RequestUser,
    @Param('presentationId') presentationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // Return empty history for new presentations
    if (presentationId === 'new') {
      return { messages: [], hasMore: false };
    }
    return this.chatService.getHistory(presentationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor: cursor || undefined,
    });
  }
}
