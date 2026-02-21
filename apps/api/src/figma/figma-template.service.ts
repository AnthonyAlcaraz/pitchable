import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FigmaService } from './figma.service.js';
import { FigmaAiMapperService } from './figma-ai-mapper.service.js';
import type { CreateFigmaTemplateDto } from './dto/create-figma-template.dto.js';
import type { MapFrameDto } from './dto/map-frame.dto.js';
import { CreditsService } from '../credits/credits.service.js';
import { CreditReason, SlideType } from '../../generated/prisma/enums.js';
import { FIGMA_AI_MAPPING_COST } from '../credits/tier-config.js';


/** Keyword map for auto-mapping Figma frame names to SlideTypes. */
const SLIDE_TYPE_KEYWORDS: Record<string, string[]> = {
  TITLE: ['title', 'cover', 'intro', 'hero'],
  PROBLEM: ['problem', 'pain', 'challenge'],
  SOLUTION: ['solution', 'answer', 'approach'],
  ARCHITECTURE: ['architecture', 'system', 'diagram', 'tech'],
  PROCESS: ['process', 'flow', 'steps', 'workflow'],
  COMPARISON: ['comparison', 'versus', 'vs', 'compare'],
  DATA_METRICS: ['data', 'metrics', 'numbers', 'stats', 'kpi'],
  CTA: ['cta', 'call to action', 'next steps', 'contact'],
  CONTENT: ['content', 'body', 'text', 'default'],
  QUOTE: ['quote', 'testimonial'],
  VISUAL_HUMOR: ['humor', 'fun', 'meme'],
  TEAM: ['team', 'people', 'founders'],
  TIMELINE: ['timeline', 'roadmap', 'milestones'],
  SECTION_DIVIDER: ['section', 'divider', 'break'],
  METRICS_HIGHLIGHT: ['highlight', 'featured'],
  FEATURE_GRID: ['features', 'grid', 'capabilities'],
  PRODUCT_SHOWCASE: ['product', 'showcase', 'demo'],
  LOGO_WALL: ['logos', 'partners', 'clients'],
  MARKET_SIZING: ['market', 'tam', 'sam'],
  SPLIT_STATEMENT: ['split', 'statement', 'big idea'],
};

/** Minimum confidence to accept an AI classification. */
const AI_MIN_CONFIDENCE = 0.6;

@Injectable()
export class FigmaTemplateService {
  private readonly logger = new Logger(FigmaTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figmaService: FigmaService,
    private readonly creditsService: CreditsService,
    @Optional() private readonly aiMapper?: FigmaAiMapperService,
  ) {}

  async createTemplate(userId: string, dto: CreateFigmaTemplateDto) {
    // Resolve token to fetch file name
    const token = await this.figmaService.resolveToken(userId);
    let figmaFileName: string | undefined;

    if (token) {
      try {
        const frames = await this.figmaService.getFrames(token, dto.figmaFileKey);
        // getFrames fetches the file — we can infer the name isn't directly returned,
        // but the first frame's pageName gives us a hint. Store file key as name fallback.
        figmaFileName = frames.length > 0 ? `Figma file (${frames.length} frames)` : undefined;
      } catch {
        // Non-critical: template still created even if file can't be fetched yet
      }
    }

    const template = await this.prisma.figmaTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        figmaFileKey: dto.figmaFileKey,
        figmaFileName,
      },
      include: { _count: { select: { mappings: true } } },
    });

    this.logger.log(`Template "${dto.name}" created for user ${userId}`);

    return {
      ...template,
      mappingCount: template._count.mappings,
    };
  }

  async listTemplates(userId: string) {
    const templates = await this.prisma.figmaTemplate.findMany({
      where: {
        OR: [{ userId }, { isPublic: true }],
      },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { mappings: true } } },
    });

    return templates.map((t) => ({
      ...t,
      mappingCount: t._count.mappings,
      isOwner: t.userId === userId,
    }));
  }

  async getTemplate(templateId: string, userId: string) {
    const template = await this.prisma.figmaTemplate.findUnique({
      where: { id: templateId },
      include: {
        mappings: { orderBy: { createdAt: 'asc' } },
        _count: { select: { mappings: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Figma template not found');
    }
    if (template.userId !== userId && !template.isPublic) {
      throw new ForbiddenException();
    }

    return {
      ...template,
      mappingCount: template._count.mappings,
      isOwner: template.userId === userId,
    };
  }

  async mapFrame(
    templateId: string,
    userId: string,
    dto: MapFrameDto,
  ) {
    const template = await this.ensureOwnership(templateId, userId);

    // Use DTO-provided name/thumbnail to avoid an API call (frontend FigmaFramePicker sends these)
    let figmaNodeName: string | undefined = dto.figmaNodeName;
    let thumbnailUrl: string | undefined = dto.thumbnailUrl;

    if (!figmaNodeName) {
      const token = await this.figmaService.resolveToken(userId);
      if (token) {
        try {
          const frames = await this.figmaService.getFrames(token, template.figmaFileKey);
          const frame = frames.find((f) => f.nodeId === dto.figmaNodeId);
          figmaNodeName = frame?.name;
          thumbnailUrl = thumbnailUrl ?? frame?.thumbnailUrl;
        } catch {
          // Non-critical
        }
      }
    }

    const mapping = await this.prisma.figmaTemplateMapping.upsert({
      where: {
        templateId_slideType_figmaNodeId: {
          templateId,
          slideType: dto.slideType,
          figmaNodeId: dto.figmaNodeId,
        },
      },
      create: {
        templateId,
        slideType: dto.slideType,
        figmaNodeId: dto.figmaNodeId,
        figmaNodeName,
        thumbnailUrl,
      },
      update: {
        figmaNodeName,
        thumbnailUrl,
      },
    });

    this.logger.log(
      `Mapped ${dto.slideType} → node ${dto.figmaNodeId} in template ${templateId}`,
    );

    return mapping;
  }

  async unmapSlideType(
    templateId: string,
    slideType: string,
    userId: string,
  ) {
    await this.ensureOwnership(templateId, userId);

    await this.prisma.figmaTemplateMapping.deleteMany({
      where: { templateId, slideType: slideType as SlideType },
    });

    return { deleted: true };
  }

  /**
   * Auto-map Figma frames to slide types.
   *
   * @param templateId - Template to map
   * @param userId - Owner of the template
   * @param useAi - If true, use Sonnet 4.6 vision to classify unmatched frames (default: false)
   */
  async autoMapFrames(templateId: string, userId: string, useAi = false) {
    const template = await this.ensureOwnership(templateId, userId);
    const token = await this.figmaService.resolveToken(userId);

    if (!token) {
      throw new NotFoundException(
        'No Figma access token found. Connect Figma first.',
      );
    }

    const frames = await this.figmaService.getFrames(token, template.figmaFileKey);
    const mappings: Array<{
      slideType: string;
      nodeId: string;
      nodeName: string;
      confidence?: number;
      source: 'keyword' | 'ai';
      reasoning?: string;
    }> = [];

    // Phase 1: keyword matching (same as before)
    const keywordMappedNodeIds = new Set<string>();

    for (const frame of frames) {
      const nameLower = frame.name.toLowerCase();

      for (const [slideType, keywords] of Object.entries(SLIDE_TYPE_KEYWORDS)) {
        const matched = keywords.some((kw) => nameLower.includes(kw));
        if (!matched) continue;

        // Only map if not already mapped for this slideType
        const exists = mappings.find((m) => m.slideType === slideType);
        if (exists) continue;

        await this.prisma.figmaTemplateMapping.upsert({
          where: {
            templateId_slideType_figmaNodeId: {
              templateId,
              slideType: slideType as SlideType,
              figmaNodeId: frame.nodeId,
            },
          },
          create: {
            templateId,
            slideType: slideType as SlideType,
            figmaNodeId: frame.nodeId,
            figmaNodeName: frame.name,
            thumbnailUrl: frame.thumbnailUrl,
          },
          update: {
            figmaNodeName: frame.name,
            thumbnailUrl: frame.thumbnailUrl,
          },
        });

        mappings.push({
          slideType,
          nodeId: frame.nodeId,
          nodeName: frame.name,
          confidence: 0.9,
          source: 'keyword',
        });

        keywordMappedNodeIds.add(frame.nodeId);
        break; // Move to next frame
      }
    }

    // Phase 2: AI vision fallback for unmapped frames
    if (useAi && this.aiMapper) {
      const unmappedFrames = frames.filter((f) => !keywordMappedNodeIds.has(f.nodeId));
      const mappedSlideTypes = new Set(mappings.map((m) => m.slideType));

      if (unmappedFrames.length > 0) {
        // Credit check for AI mapping
        const hasCredits = await this.creditsService.hasEnoughCredits(userId, FIGMA_AI_MAPPING_COST);
        if (!hasCredits) {
          throw new BadRequestException('Insufficient credits for AI mapping (1 credit required)');
        }

        this.logger.log(
          `AI analysis: ${unmappedFrames.length} unmapped frames to classify`,
        );

        try {
          const aiResults = await this.aiMapper.analyzeFrames(unmappedFrames);

          for (const result of aiResults) {
            // Skip low-confidence results
            if (result.confidence < AI_MIN_CONFIDENCE) continue;

            // Skip if this slideType is already mapped
            if (mappedSlideTypes.has(result.slideType)) continue;

            await this.prisma.figmaTemplateMapping.upsert({
              where: {
                templateId_slideType_figmaNodeId: {
                  templateId,
                  slideType: result.slideType as SlideType,
                  figmaNodeId: result.nodeId,
                },
              },
              create: {
                templateId,
                slideType: result.slideType as SlideType,
                figmaNodeId: result.nodeId,
                figmaNodeName: result.name,
                thumbnailUrl: unmappedFrames.find((f) => f.nodeId === result.nodeId)?.thumbnailUrl,
              },
              update: {
                figmaNodeName: result.name,
                thumbnailUrl: unmappedFrames.find((f) => f.nodeId === result.nodeId)?.thumbnailUrl,
              },
            });

            mappings.push({
              slideType: result.slideType,
              nodeId: result.nodeId,
              nodeName: result.name,
              confidence: result.confidence,
              source: 'ai',
              reasoning: result.reasoning,
            });

            mappedSlideTypes.add(result.slideType);
          }
          // Deduct credit for AI mapping
          await this.creditsService.deductCredits(
            userId,
            FIGMA_AI_MAPPING_COST,
            CreditReason.FIGMA_AI_MAPPING,
            templateId,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err; // Re-throw credit errors
          const msg = err instanceof Error ? err.message : 'unknown';
          this.logger.warn(`AI frame analysis failed (non-fatal): ${msg}`);
          // Keyword-only results still returned
        }
      }
    }

    this.logger.log(
      `Auto-mapped ${mappings.length} frames in template ${templateId} (keyword: ${mappings.filter((m) => m.source === 'keyword').length}, ai: ${mappings.filter((m) => m.source === 'ai').length})`,
    );

    // Check rate limit status and include plan warning in response
    const rateLimitStatus = await this.figmaService.checkRateLimitStatus(token);

    return {
      mapped: mappings.length,
      mappings,
      ...(rateLimitStatus.warning && { rateLimitWarning: rateLimitStatus.warning }),
      ...(rateLimitStatus.planTier && { figmaPlanTier: rateLimitStatus.planTier }),
      ...(rateLimitStatus.isRateLimited && { isRateLimited: true }),
    };
  }

  async deleteTemplate(templateId: string, userId: string) {
    await this.ensureOwnership(templateId, userId);

    await this.prisma.figmaTemplate.delete({
      where: { id: templateId },
    });

    this.logger.log(`Template ${templateId} deleted by user ${userId}`);
    return { deleted: true };
  }

  async refreshThumbnails(templateId: string, userId: string) {
    const template = await this.ensureOwnership(templateId, userId);
    const token = await this.figmaService.resolveToken(userId);

    if (!token) {
      throw new NotFoundException('No Figma access token found.');
    }

    const mappings = await this.prisma.figmaTemplateMapping.findMany({
      where: { templateId },
    });

    if (mappings.length === 0) return { refreshed: 0 };

    const frames = await this.figmaService.getFrames(token, template.figmaFileKey);
    const frameMap = new Map(frames.map((f) => [f.nodeId, f]));
    let refreshed = 0;

    for (const mapping of mappings) {
      const frame = frameMap.get(mapping.figmaNodeId);
      if (frame?.thumbnailUrl) {
        await this.prisma.figmaTemplateMapping.update({
          where: { id: mapping.id },
          data: {
            thumbnailUrl: frame.thumbnailUrl,
            figmaNodeName: frame.name,
          },
        });
        refreshed++;
      }
    }

    this.logger.log(
      `Refreshed ${refreshed} thumbnails in template ${templateId}`,
    );
    return { refreshed };
  }

  /**
   * Remove a single frame mapping from a template.
   */
  async unmapSingleFrame(
    templateId: string,
    userId: string,
    slideType: string,
    nodeId: string,
  ) {
    await this.ensureOwnership(templateId, userId);

    await this.prisma.figmaTemplateMapping.deleteMany({
      where: {
        templateId,
        slideType: slideType as SlideType,
        figmaNodeId: nodeId,
      },
    });

    this.logger.log(
      `Unmapped single frame ${nodeId} from ${slideType} in template ${templateId}`,
    );
    return { deleted: true };
  }

  /** Figma URL regex: extracts file key from figma.com/file/KEY or figma.com/design/KEY */
  private static readonly FIGMA_URL_RE = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/;

  /**
   * One-shot: create a template from a Figma URL and auto-map all frames with AI.
   */
  async createFromUrl(
    userId: string,
    figmaUrl: string,
    name?: string,
  ) {
    const match = figmaUrl.match(FigmaTemplateService.FIGMA_URL_RE);
    if (!match) {
      throw new BadRequestException(
        'Invalid Figma URL. Expected: https://www.figma.com/file/KEY/... or https://www.figma.com/design/KEY/...',
      );
    }
    const fileKey = match[1];

    // Derive name from URL slug if not provided
    const derivedName =
      name ??
      figmaUrl
        .split('/').pop()
        ?.split('?')[0]
        ?.replace(/-/g, ' ')
        ?.replace(/\w/g, (c) => c.toUpperCase()) ??
      `Figma ${fileKey.slice(0, 8)}`;

    // Create the template
    const template = await this.createTemplate(userId, {
      name: derivedName,
      figmaFileKey: fileKey,
    });

    // Auto-map with AI
    const autoMapResult = await this.autoMapFrames(template.id, userId, true);

    // Re-fetch full template with mappings
    const full = await this.getTemplate(template.id, userId);

    return {
      template: full,
      autoMapResult,
    };
  }

  private async ensureOwnership(templateId: string, userId: string) {
    const template = await this.prisma.figmaTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Figma template not found');
    }
    if (template.userId !== userId) {
      throw new ForbiddenException();
    }

    return template;
  }
}
