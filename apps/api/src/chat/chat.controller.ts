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
import type { HttpResponse } from '../types/express.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PresentationOwnerGuard } from '../auth/guards/presentation-owner.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatService } from './chat.service.js';
import { GenerationService } from './generation.service.js';
import { InteractionGateService } from './interaction-gate.service.js';
import { SlideModifierService } from './slide-modifier.service.js';
import { EditClassifierService } from './edit-classifier.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { SLIDE_MODIFICATION_COST } from '../credits/tier-config.js';
import {
  PresentationType,
  PresentationStatus,
  AudienceType,
  PitchGoal,
  CompanyStage,
  ToneStyle,
  TechnicalLevel,
  StoryFramework,
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
    private readonly generation: GenerationService,
    private readonly prisma: PrismaService,
    private readonly interactionGate: InteractionGateService,
    private readonly slideModifier: SlideModifierService,
    private readonly editClassifier: EditClassifierService,
  ) {}

  @Post(':presentationId/message')
  @UseGuards(PresentationOwnerGuard)
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('presentationId') rawPresentationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: HttpResponse,
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

        // Use lens from request body (cockpit selection) or fall back to user's default
        let pitchLensId = dto.lensId ?? null;
        if (!pitchLensId) {
          const defaultLens = await this.prisma.pitchLens.findFirst({
            where: { userId: user.userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            select: { id: true },
          });
          pitchLensId = defaultLens?.id ?? null;
        }

        // Auto-create a default Pitch Lens if user has none (skipped onboarding)
        if (!pitchLensId) {
          const autoLens = await this.prisma.pitchLens.create({
            data: {
              userId: user.userId,
              name: 'Default Lens',
              audienceType: AudienceType.CUSTOMERS,
              pitchGoal: PitchGoal.SELL_PRODUCT,
              industry: 'General',
              companyStage: CompanyStage.GROWTH,
              toneStyle: ToneStyle.CONVERSATIONAL,
              technicalLevel: TechnicalLevel.SEMI_TECHNICAL,
              selectedFramework: StoryFramework.HEROS_JOURNEY,
              isDefault: true,
            },
          });
          pitchLensId = autoLens.id;
          this.logger.log(`Auto-created default Pitch Lens ${autoLens.id} for user ${user.userId}`);
        }

        const pres = await this.prisma.presentation.create({
          data: {
            title: 'Untitled',
            sourceContent: '',
            presentationType: PresentationType.STANDARD,
            status: PresentationStatus.DRAFT,
            themeId,
            imageCount: 0,
            userId: user.userId,
            pitchLensId,
            briefId: dto.briefId ?? null,
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

  @Post('suggest-subjects')
  async suggestSubjects(
    @Body() body: { lensId?: string; briefId?: string },
  ) {
    const suggestions = await this.chatService.suggestSubjects(body.lensId, body.briefId);
    return { suggestions };
  }

  @Post(':presentationId/interact')
  @UseGuards(PresentationOwnerGuard)
  async interact(
    @CurrentUser() _user: RequestUser,
    @Param('presentationId') presentationId: string,
    @Body() body: { interactionType: string; contextId: string; selection: unknown },
  ) {
    const accepted = this.interactionGate.respond(
      presentationId,
      body.interactionType,
      body.contextId,
      body.selection,
    );
    return { accepted };
  }

  @Post(':presentationId/edit-outline-slide')
  @UseGuards(PresentationOwnerGuard)
  async editOutlineSlide(
    @CurrentUser() user: RequestUser,
    @Param('presentationId') presentationId: string,
    @Body() body: { slideIndex: number; feedback: string },
  ) {
    return this.generation.regenerateOutlineSlide(
      user.userId,
      presentationId,
      body.slideIndex,
      body.feedback,
    );
  }

  /**
   * Classify + execute edit. Cosmetic changes execute immediately.
   * Structural changes return classification data for frontend confirmation.
   */
  @Post(':presentationId/edit-slide')
  @UseGuards(PresentationOwnerGuard)
  async editSlide(
    @CurrentUser() user: RequestUser,
    @Param('presentationId') presentationId: string,
    @Body() body: { slideId: string; feedback: string },
  ) {
    // Find the slide
    const slide = await this.prisma.slide.findFirst({
      where: { id: body.slideId, presentationId },
    });

    if (!slide) {
      return { success: false, message: 'Slide not found.' };
    }

    // Load all slides for deck context
    const allSlides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
      select: { slideNumber: true, title: true, slideType: true },
    });

    // Classify the edit
    const classification = await this.editClassifier.classify(
      { title: slide.title, body: slide.body, slideType: slide.slideType },
      body.feedback,
      allSlides,
    );

    if (classification.type === 'cosmetic') {
      // Execute immediately — same behavior as before
      const result = await this.slideModifier.modifySlide(
        user.userId,
        presentationId,
        slide.slideNumber,
        body.feedback,
      );

      return {
        success: result.success,
        classification: 'cosmetic' as const,
        message: result.message,
        slide: result.success
          ? (await this.prisma.slide.findUnique({ where: { id: slide.id } })) ?? undefined
          : undefined,
      };
    }

    // Structural — return classification data for confirmation
    const downstreamCount = allSlides.filter((s) => s.slideNumber > slide.slideNumber).length;
    const totalAffected = 1 + downstreamCount;
    const creditCost = totalAffected * SLIDE_MODIFICATION_COST;

    const affectedSlides = allSlides
      .filter((s) => s.slideNumber >= slide.slideNumber)
      .map((s) => ({ slideNumber: s.slideNumber, title: s.title, slideType: s.slideType }));

    return {
      success: true,
      classification: 'structural' as const,
      reason: classification.reason,
      affectedSlideCount: totalAffected,
      creditCost,
      affectedSlides,
      slideNumber: slide.slideNumber,
    };
  }

  /**
   * Execute a confirmed structural cascade edit.
   * Called after user confirms in the CascadeConfirmModal.
   */
  @Post(':presentationId/execute-cascade')
  @UseGuards(PresentationOwnerGuard)
  async executeCascade(
    @CurrentUser() user: RequestUser,
    @Param('presentationId') presentationId: string,
    @Body() body: { slideId: string; feedback: string },
  ) {
    const slide = await this.prisma.slide.findFirst({
      where: { id: body.slideId, presentationId },
    });

    if (!slide) {
      return { success: false, message: 'Slide not found.' };
    }

    const result = await this.slideModifier.cascadeRegenerateSlides(
      user.userId,
      presentationId,
      slide.slideNumber,
      body.feedback,
    );

    return result;
  }
}
