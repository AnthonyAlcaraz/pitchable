import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FigmaService } from './figma.service.js';
import type { CreateFigmaTemplateDto } from './dto/create-figma-template.dto.js';
import type { MapFrameDto } from './dto/map-frame.dto.js';
import { SlideType } from '../../generated/prisma/enums.js';

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

@Injectable()
export class FigmaTemplateService {
  private readonly logger = new Logger(FigmaTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figmaService: FigmaService,
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

    // Fetch node name and thumbnail via Figma API
    let figmaNodeName: string | undefined;
    let thumbnailUrl: string | undefined;
    const token = await this.figmaService.resolveToken(userId);

    if (token) {
      try {
        const frames = await this.figmaService.getFrames(token, template.figmaFileKey);
        const frame = frames.find((f) => f.nodeId === dto.figmaNodeId);
        figmaNodeName = frame?.name;
        thumbnailUrl = frame?.thumbnailUrl;
      } catch {
        // Non-critical
      }
    }

    const mapping = await this.prisma.figmaTemplateMapping.upsert({
      where: {
        templateId_slideType: {
          templateId,
          slideType: dto.slideType,
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
        figmaNodeId: dto.figmaNodeId,
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

  async autoMapFrames(templateId: string, userId: string) {
    const template = await this.ensureOwnership(templateId, userId);
    const token = await this.figmaService.resolveToken(userId);

    if (!token) {
      throw new NotFoundException(
        'No Figma access token found. Connect Figma first.',
      );
    }

    const frames = await this.figmaService.getFrames(token, template.figmaFileKey);
    const mappings: Array<{ slideType: string; nodeId: string; nodeName: string }> = [];

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
            templateId_slideType: {
              templateId,
              slideType: slideType as SlideType,
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
            figmaNodeId: frame.nodeId,
            figmaNodeName: frame.name,
            thumbnailUrl: frame.thumbnailUrl,
          },
        });

        mappings.push({
          slideType,
          nodeId: frame.nodeId,
          nodeName: frame.name,
        });

        break; // Move to next frame
      }
    }

    this.logger.log(
      `Auto-mapped ${mappings.length} frames in template ${templateId}`,
    );

    return { mapped: mappings.length, mappings };
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
