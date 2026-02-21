import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FigmaService } from './figma.service.js';
import { FigmaImageSyncService } from './figma-image-sync.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConnectFigmaDto } from './dto/connect-figma.dto.js';
import { AssignFigmaFrameDto } from './dto/assign-figma-frame.dto.js';

interface AuthRequest {
  user: { userId: string };
}

@Controller('figma')
@UseGuards(JwtAuthGuard)
export class FigmaController {
  constructor(
    private readonly figmaService: FigmaService,
    private readonly figmaImageSync: FigmaImageSyncService,
    private readonly prisma: PrismaService,
  ) {}

  /** Save Figma personal access token (user-level). */
  @Post('connect')
  async connect(
    @Request() req: AuthRequest,
    @Body() dto: ConnectFigmaDto,
  ) {
    try {
      await this.figmaService.saveToken(req.user.userId, dto.accessToken);
      return { connected: true };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Invalid Figma token: ${msg}`);
    }
  }

  /** Remove Figma integration. */
  @Delete('disconnect')
  async disconnect(@Request() req: AuthRequest) {
    await this.figmaService.disconnect(req.user.userId);
    return { connected: false };
  }

  /** Check Figma connection status (includes plan tier & API limits). */
  @Get('status')
  async status(@Request() req: AuthRequest) {
    const base = await this.figmaService.getStatus(req.user.userId);
    if (!base.connected) return base;

    // Enrich with plan tier and rate limit info
    const token = await this.figmaService.getToken(req.user.userId);
    if (token) {
      const rateLimitStatus = await this.figmaService.checkRateLimitStatus(token);
      const planTier = rateLimitStatus.planTier;
      const planInfo = planTier
        ? FigmaService.PLAN_LIMITS[planTier]
        : undefined;

      return {
        ...base,
        planTier: planInfo?.label ?? planTier ?? 'unknown',
        dailyApiReads: planInfo?.dailyReads,
        planWarning: planInfo?.warning || undefined,
        isRateLimited: rateLimitStatus.isRateLimited,
        retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
      };
    }

    return base;
  }

  /** Re-validate stored Figma token. */
  @Post('validate')
  async validate(@Request() req: AuthRequest) {
    const valid = await this.figmaService.validateToken(req.user.userId);
    return { valid };
  }

  /**
   * Browse frames in a Figma file.
   * File key is extracted from URLs like: https://www.figma.com/design/FILE_KEY/title
   */
  @Get('files/:fileKey')
  async getFileFrames(
    @Request() req: AuthRequest,
    @Param('fileKey') fileKey: string,
    @Query('lensId') lensId?: string,
  ) {
    const token = await this.figmaService.resolveToken(
      req.user.userId,
      lensId,
    );

    if (!token) {
      return {
        error: 'No Figma token found. Connect via settings or Pitch Lens.',
        frames: [],
      };
    }

    // Check rate limit before making the expensive getFrames call
    const rateLimitStatus = await this.figmaService.checkRateLimitStatus(token);
    if (rateLimitStatus.isRateLimited) {
      const planTier = rateLimitStatus.planTier;
      const planInfo = planTier
        ? FigmaService.PLAN_LIMITS[planTier]
        : undefined;

      return {
        frames: [],
        isRateLimited: true,
        retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
        planTier: planInfo?.label ?? planTier,
        planWarning: rateLimitStatus.warning,
      };
    }

    const frames = await this.figmaService.getFrames(token, fileKey);

    // Include plan info so frontend can show proactive warnings
    const planTier = rateLimitStatus.planTier;
    const planInfo = planTier
      ? FigmaService.PLAN_LIMITS[planTier]
      : undefined;

    return {
      frames,
      planTier: planInfo?.label ?? planTier,
      dailyApiReads: planInfo?.dailyReads,
      ...(planInfo?.warning && { planWarning: planInfo.warning }),
    };
  }

  /** Get Figma plan limits reference (no auth token needed, static data). */
  @Get('plan-limits')
  getPlanLimits() {
    return {
      plans: Object.entries(FigmaService.PLAN_LIMITS).map(([key, info]) => ({
        tier: key,
        label: info.label,
        dailyReads: info.dailyReads,
        warning: info.warning || undefined,
      })),
      recommendation:
        'Starter (free) plans have very limited API access (~50 file reads/day). ' +
        'Auto-map and template sync may exhaust your quota quickly. ' +
        'Professional plans support ~500 reads/day — sufficient for normal usage.',
    };
  }

  /** Assign a Figma frame to a slide (exports PNG → S3 → Slide.imageUrl). */
  @Post('slides/:slideId/assign')
  async assignFrame(
    @Request() req: AuthRequest,
    @Param('slideId') slideId: string,
    @Body() dto: AssignFigmaFrameDto,
    @Query('lensId') lensId?: string,
  ) {
    const imageUrl = await this.figmaImageSync.syncFigmaFrameToSlide(
      slideId,
      req.user.userId,
      dto.fileKey,
      dto.nodeId,
      lensId,
      dto.nodeName,
    );
    return { imageUrl };
  }

  /** Re-sync a Figma-sourced slide image (when designer updates the frame). */
  @Post('slides/:slideId/refresh')
  async refreshFrame(
    @Request() req: AuthRequest,
    @Param('slideId') slideId: string,
    @Query('lensId') lensId?: string,
  ) {
    const imageUrl = await this.figmaImageSync.refreshFigmaImage(
      slideId,
      req.user.userId,
      lensId,
    );
    return { imageUrl };
  }

  /**
   * Get changed slides since a given timestamp (for plugin sync polling).
   */
  @Get('sync/:presentationId/changes')
  async getSyncChanges(
    @Param('presentationId') presentationId: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date(0);

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { id: true, updatedAt: true },
    });

    if (!presentation) {
      throw new BadRequestException(`Presentation ${presentationId} not found`);
    }

    const slides = await this.prisma.slide.findMany({
      where: {
        presentationId,
        updatedAt: { gt: sinceDate },
      },
      orderBy: { slideNumber: 'asc' },
      select: {
        id: true,
        slideNumber: true,
        slideType: true,
        title: true,
        body: true,
        speakerNotes: true,
        imageUrl: true,
        updatedAt: true,
      },
    });

    const changes = slides.map((slide) => ({
      slideId: slide.id,
      slideNumber: slide.slideNumber,
      slideType: slide.slideType,
      changedFields: ['title', 'body', 'speakerNotes', 'imageUrl'],
      title: slide.title,
      body: slide.body,
      speakerNotes: slide.speakerNotes,
      imageUrl: slide.imageUrl,
    }));

    return {
      presentationId,
      lastModified: presentation.updatedAt.toISOString(),
      changes,
    };
  }
}
