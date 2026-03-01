import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { EmailService } from '../email/email.service.js';
import { ContentParserService } from './content-parser.service.js';
import { SlideStructurerService } from './slide-structurer.service.js';
import type { SlideDefinition } from './slide-structurer.service.js';
import type { CreatePresentationDto } from './dto/create-presentation.dto.js';
import type { UpdateSlideDto } from './dto/update-slide.dto.js';
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  ExportFormat,
  JobStatus,
  ImageSource,
} from '../../generated/prisma/enums.js';
import type { SlideContent } from '../constraints/density-validator.js';
import { CreditsService } from '../credits/credits.service.js';
import { IMAGE_GENERATION_COST } from '../credits/tier-config.js';

// ── Interfaces ──────────────────────────────────────────────

export interface PresentationWithSlides {
  id: string;
  title: string;
  description: string | null;
  sourceContent: string;
  presentationType: PresentationType;
  status: PresentationStatus;
  themeId: string;
  theme?: {
    id: string;
    name: string;
    displayName: string;
    colorPalette: Record<string, string>;
    headingFont: string;
    bodyFont: string;
  } | null;
  imageCount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  slides: Array<{
    id: string;
    slideNumber: number;
    title: string;
    body: string;
    speakerNotes: string | null;
    slideType: SlideType;
    imageUrl: string | null;
    imagePrompt: string | null;
    imageSource: ImageSource;
    figmaFileKey: string | null;
    figmaNodeId: string | null;
    figmaNodeName: string | null;
    previewUrl: string | null;
    createdAt: Date;
  }>;
}

export interface ImageJobResult {
  id: string;
  slideId: string;
  status: JobStatus;
  prompt: string;
  createdAt: Date;
}

// ── Constants ───────────────────────────────────────────────

/** Default theme name used when no themeId is provided. */
const DEFAULT_THEME_NAME = 'pitchable-dark';

/** Default presentation type when none specified. */
const DEFAULT_PRESENTATION_TYPE = PresentationType.STANDARD;

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class PresentationsService {
  private readonly logger = new Logger(PresentationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly constraints: ConstraintsService,
    private readonly credits: CreditsService,
    private readonly exportsService: ExportsService,
    private readonly emailService: EmailService,
    private readonly contentParser: ContentParserService,
    private readonly slideStructurer: SlideStructurerService,
  ) {}

  /**
   * Create a new presentation: parse content, structure slides,
   * validate constraints, save to DB, and optionally queue jobs.
   */
  async create(
    userId: string,
    dto: CreatePresentationDto,
  ): Promise<PresentationWithSlides> {
    // 1. Resolve theme and fetch palette
    const themeId = await this.resolveThemeId(dto.themeId);
    const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
    const themeColors = theme?.colorPalette
      ? { ...(theme.colorPalette as { primary: string; secondary: string; accent: string; background: string; text: string }), headingFont: theme.headingFont, bodyFont: theme.bodyFont }
      : undefined;

    // 2. Parse content into structured sections
    const parsed = this.contentParser.parseContent(dto.content);

    if (parsed.sections.length === 0) {
      throw new BadRequestException(
        'Content must contain at least one section of text. ' +
        'Use Markdown headings (##) or separate paragraphs with blank lines.',
      );
    }

    // 3. Structure into slide definitions
    const presentationType = dto.presentationType ?? DEFAULT_PRESENTATION_TYPE;
    let slideDefinitions = this.slideStructurer.structureSlides(
      parsed,
      presentationType,
    );

    // 4. Validate each slide against density constraints and auto-fix
    slideDefinitions = this.validateAndFixSlides(slideDefinitions, themeColors);

    // 5. Create presentation + slides in a transaction
    const presentation = await this.prisma.$transaction(async (tx) => {
      const pres = await tx.presentation.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          sourceContent: dto.content,
          presentationType,
          status: PresentationStatus.DRAFT,
          themeId,
          imageCount: dto.imageCount ?? 0,
          userId,
        },
      });

      // Create all slides
      const slideData = slideDefinitions.map((def) => ({
        presentationId: pres.id,
        slideNumber: def.slideNumber,
        title: def.title,
        body: def.body,
        speakerNotes: def.speakerNotes,
        slideType: def.slideType,
        imagePrompt: def.imagePromptHint,
      }));

      await tx.slide.createMany({ data: slideData });

      // Fetch the full presentation with slides
      const result = await tx.presentation.findUniqueOrThrow({
        where: { id: pres.id },
        include: {
          slides: {
            orderBy: { slideNumber: 'asc' },
          },
        },
      });

      return result;
    });

    // 6. Queue image generation jobs if requested
    if ((dto.imageCount ?? 0) > 0) {
      await this.queueImageGeneration(
        presentation.id,
        presentation.slides,
        dto.imageCount ?? 0,
      );
    }

    // 7. Queue export jobs if formats specified
    if (dto.exportFormats && dto.exportFormats.length > 0) {
      await this.queueExportJobs(presentation.id, dto.exportFormats);
    }

    // 8. Update status to COMPLETED (sync generation for now)
    await this.prisma.presentation.update({
      where: { id: presentation.id },
      data: { status: PresentationStatus.COMPLETED },
    });

    this.logger.log(
      `Created presentation "${dto.title}" with ${slideDefinitions.length} slides for user ${userId}`,
    );

    return {
      ...presentation,
      slides: presentation.slides.map((s) => ({
        id: s.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imageUrl: s.imageUrl,
        imagePrompt: s.imagePrompt,
        imageSource: s.imageSource,
        figmaFileKey: s.figmaFileKey,
        figmaNodeId: s.figmaNodeId,
        figmaNodeName: s.figmaNodeName,
        previewUrl: s.previewUrl,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * List all presentations for a user.
   */
  async findAll(userId: string): Promise<Array<{
    id: string;
    title: string;
    description: string | null;
    presentationType: PresentationType;
    status: PresentationStatus;
    imageCount: number;
    createdAt: Date;
    updatedAt: Date;
    slideCount: number;
    briefId: string | null;
    briefName: string | null;
    pitchLensId: string | null;
    pitchLensName: string | null;
    isPublic: boolean;
  }>> {
    const presentations = await this.prisma.presentation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { slides: true } },
        brief: { select: { id: true, name: true } },
        pitchLens: { select: { id: true, name: true } },
      },
    });

    return presentations.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      presentationType: p.presentationType,
      status: p.status,
      imageCount: p.imageCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      slideCount: p._count.slides,
      briefId: p.brief?.id ?? null,
      briefName: p.brief?.name ?? null,
      pitchLensId: p.pitchLens?.id ?? null,
      pitchLensName: p.pitchLens?.name ?? null,
      isPublic: p.isPublic,
    }));
  }

  /**
   * Get a single presentation with all slides.
   */
  async findOne(id: string, userId: string): Promise<PresentationWithSlides> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: { slideNumber: 'asc' },
        },
        theme: true,
      },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    return {
      ...presentation,
      theme: presentation.theme
        ? {
            id: presentation.theme.id,
            name: presentation.theme.name,
            displayName: presentation.theme.displayName,
            colorPalette: presentation.theme.colorPalette as Record<string, string>,
            headingFont: presentation.theme.headingFont,
            bodyFont: presentation.theme.bodyFont,
          }
        : null,
      slides: presentation.slides.map((s) => ({
        id: s.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imageUrl: s.imageUrl,
        imagePrompt: s.imagePrompt,
        imageSource: s.imageSource,
        figmaFileKey: s.figmaFileKey,
        figmaNodeId: s.figmaNodeId,
        figmaNodeName: s.figmaNodeName,
        previewUrl: s.previewUrl,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Update an individual slide's content.
   */
  async updateSlide(
    slideId: string,
    userId: string,
    dto: UpdateSlideDto,
  ): Promise<{
    id: string;
    slideNumber: number;
    title: string;
    body: string;
    speakerNotes: string | null;
    slideType: SlideType;
    imageUrl: string | null;
    imagePrompt: string | null;
    createdAt: Date;
  }> {
    // Verify the slide exists and belongs to the user
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      include: { presentation: { select: { userId: true } } },
    });

    if (!slide) {
      throw new NotFoundException(`Slide with id "${slideId}" not found`);
    }

    if (slide.presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this slide');
    }

    // Build update data from provided fields
    const updateData: Record<string, string | null> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.speakerNotes !== undefined) updateData.speakerNotes = dto.speakerNotes;
    if (dto.slideType !== undefined) updateData.slideType = dto.slideType;
    // Invalidate preview thumbnail when content changes (will be re-rendered on next export)
    if (dto.title !== undefined || dto.body !== undefined) {
      updateData.previewUrl = null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    // Validate density if body is being updated
    if (dto.body !== undefined || dto.title !== undefined) {
      const slideContent: SlideContent = {
        title: dto.title ?? slide.title,
        body: dto.body ?? slide.body,
      };
      const densityResult = this.constraints.validateDensity(slideContent);
      if (!densityResult.valid) {
        throw new BadRequestException(
          `Slide content violates density constraints: ${densityResult.violations.join('; ')}`,
        );
      }
    }

    const updated = await this.prisma.slide.update({
      where: { id: slideId },
      data: updateData,
    });

    return {
      id: updated.id,
      slideNumber: updated.slideNumber,
      title: updated.title,
      body: updated.body,
      speakerNotes: updated.speakerNotes,
      slideType: updated.slideType,
      imageUrl: updated.imageUrl,
      imagePrompt: updated.imagePrompt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Regenerate the AI image for a specific slide.
   * Creates a new ImageJob in QUEUED status.
   */
  async regenerateSlideImage(
    slideId: string,
    userId: string,
  ): Promise<ImageJobResult> {
    // Verify slide ownership
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      include: { presentation: { select: { userId: true } } },
    });

    if (!slide) {
      throw new NotFoundException(`Slide with id "${slideId}" not found`);
    }

    if (slide.presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this slide');
    }

    if (!slide.imagePrompt) {
      throw new BadRequestException('This slide has no image prompt configured');
    }

    // Credit pre-check: ensure user can afford image regeneration
    const hasCredits = await this.credits.hasEnoughCredits(userId, IMAGE_GENERATION_COST);
    if (!hasCredits) {
      throw new BadRequestException(
        'Insufficient credits to regenerate image. Each image costs 1 credit.',
      );
    }

    // Create a new image job
    const imageJob = await this.prisma.imageJob.create({
      data: {
        slideId,
        status: JobStatus.QUEUED,
        prompt: slide.imagePrompt,
        creditsUsed: 1,
      },
    });

    this.logger.log(
      `Queued image regeneration job ${imageJob.id} for slide ${slideId}`,
    );

    return {
      id: imageJob.id,
      slideId: imageJob.slideId,
      status: imageJob.status,
      prompt: imageJob.prompt,
      createdAt: imageJob.createdAt,
    };
  }

  /**
   * Delete a presentation and all associated data.
   */
  async delete(id: string, userId: string): Promise<void> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    await this.prisma.presentation.delete({ where: { id } });

    this.logger.log(`Deleted presentation ${id} for user ${userId}`);
  }

  /**
   * Queue export jobs for the given formats.
   */
  async queueExport(
    presentationId: string,
    userId: string,
    formats: string[],
    emailTo?: string,
    userEmail?: string,
  ): Promise<Array<{ id: string; format: ExportFormat; status: JobStatus }>> {
    // Verify ownership
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { userId: true },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation with id "${presentationId}" not found`);
    }

    if (presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    // Resolve email: "me" sends to the authenticated user's email
    const resolvedEmail = emailTo === 'me' ? userEmail : emailTo;

    return this.queueExportJobs(presentationId, formats, resolvedEmail);
  }

  /**
   * Rename a presentation (title and/or description).
   */
  async rename(
    id: string,
    userId: string,
    data: { title?: string; description?: string },
  ): Promise<{ id: string; title: string; description: string | null }> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    const updateData: Record<string, string> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('At least one field (title or description) must be provided');
    }

    const updated = await this.prisma.presentation.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
    };
  }

  /**
   * Toggle public visibility of a presentation.
   * Only COMPLETED presentations can be made public.
   */
  async setVisibility(
    id: string,
    userId: string,
    isPublic: boolean,
  ): Promise<{ id: string; isPublic: boolean; publishedAt: Date | null }> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (presentation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    if (isPublic && presentation.status !== PresentationStatus.COMPLETED) {
      throw new BadRequestException('Only completed presentations can be made public');
    }

    const updated = await this.prisma.presentation.update({
      where: { id },
      data: {
        isPublic,
        publishedAt: isPublic ? new Date() : null,
      },
      select: { id: true, isPublic: true, publishedAt: true },
    });

    this.logger.log(`Set visibility of presentation ${id} to ${isPublic ? 'public' : 'private'}`);

    return updated;
  }

  /**
   * Update the logo URL for a presentation.
   */
  async updateLogoUrl(id: string, userId: string, logoUrl: string): Promise<{ id: string; logoUrl: string | null }> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!presentation) throw new NotFoundException(`Presentation with id "${id}" not found`);
    if (presentation.userId !== userId) throw new ForbiddenException('You do not have access to this presentation');

    const updated = await this.prisma.presentation.update({
      where: { id },
      data: { logoUrl },
      select: { id: true, logoUrl: true },
    });
    this.logger.log(`Updated logo for presentation ${id}`);
    return updated;
  }

  /**
   * Clear the logo URL for a presentation.
   */
  async clearLogoUrl(id: string, userId: string): Promise<{ id: string; logoUrl: string | null }> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!presentation) throw new NotFoundException(`Presentation with id "${id}" not found`);
    if (presentation.userId !== userId) throw new ForbiddenException('You do not have access to this presentation');

    const updated = await this.prisma.presentation.update({
      where: { id },
      data: { logoUrl: null },
      select: { id: true, logoUrl: true },
    });
    this.logger.log(`Cleared logo for presentation ${id}`);
    return updated;
  }

  // ── Temporary diagnostic methods ──────────────────────────
  async diagPitchLens(userId: string): Promise<string> {
    // Test 1: count
    const count = await this.prisma.pitchLens.count({ where: { userId } });
    // Test 2: findMany with all fields (like pitch-lens service does)
    const lenses = await this.prisma.pitchLens.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { presentations: true } } },
    });
    return `${count} lenses, findMany returned ${lenses.length}, first: ${lenses[0]?.name ?? 'none'}`;
  }

  async diagExport(userId: string): Promise<string> {
    // Test the full export pipeline on a recent presentation
    const pres = await this.prisma.presentation.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      include: { slides: { take: 1 } },
    });
    if (!pres) return 'no completed presentations';

    // Test creating an export job
    try {
      const job = await this.exportsService.createExportJob(pres.id, 'PDF');
      return `export job created: ${job.id}`;
    } catch (e: unknown) {
      return `createExportJob error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  /**
   * Duplicate a presentation with all its slides.
   */
  async duplicate(
    id: string,
    userId: string,
  ): Promise<PresentationWithSlides> {
    const original = await this.prisma.presentation.findUnique({
      where: { id },
      include: { slides: { orderBy: { slideNumber: 'asc' } } },
    });

    if (!original) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (original.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const pres = await tx.presentation.create({
        data: {
          title: `${original.title} (copy)`,
          description: original.description,
          sourceContent: original.sourceContent,
          presentationType: original.presentationType,
          status: PresentationStatus.COMPLETED,
          themeId: original.themeId,
          imageCount: original.imageCount,
          briefId: original.briefId,
          pitchLensId: original.pitchLensId,
          forkedFromId: original.id,
          userId,
        },
      });

      const slideData = original.slides.map((s) => ({
        presentationId: pres.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imagePrompt: s.imagePrompt,
        imageUrl: s.imageUrl,
        imageLocalPath: s.imageLocalPath,
      }));

      await tx.slide.createMany({ data: slideData });

      return tx.presentation.findUniqueOrThrow({
        where: { id: pres.id },
        include: { slides: { orderBy: { slideNumber: 'asc' } } },
      });
    });

    this.logger.log(`Duplicated presentation ${id} → ${duplicated.id} for user ${userId}`);

    return {
      ...duplicated,
      slides: duplicated.slides.map((s) => ({
        id: s.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imageUrl: s.imageUrl,
        imagePrompt: s.imagePrompt,
        imageSource: s.imageSource,
        figmaFileKey: s.figmaFileKey,
        figmaNodeId: s.figmaNodeId,
        figmaNodeName: s.figmaNodeName,
        previewUrl: s.previewUrl,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Quick-create a blank DRAFT presentation, optionally linked to a brief and/or lens.
   * Used by the Pitch Cockpit's Composer Bar.
   */
  async quickCreate(
    userId: string,
    opts?: { briefId?: string; pitchLensId?: string },
  ): Promise<{ id: string }> {
    const themeId = await this.resolveThemeId(undefined);

    // Use lens name as default title when pitchLensId is provided
    let title = 'Untitled';
    if (opts?.pitchLensId) {
      const lens = await this.prisma.pitchLens.findUnique({
        where: { id: opts.pitchLensId },
        select: { name: true },
      });
      if (lens?.name) title = lens.name;
    }

    const pres = await this.prisma.presentation.create({
      data: {
        title,
        sourceContent: '',
        presentationType: PresentationType.STANDARD,
        status: PresentationStatus.DRAFT,
        themeId,
        imageCount: 0,
        userId,
        briefId: opts?.briefId ?? null,
        pitchLensId: opts?.pitchLensId ?? null,
      },
    });
    this.logger.log(
      `Quick-created presentation ${pres.id} for user ${userId}` +
      (opts?.briefId ? ` (brief: ${opts.briefId})` : '') +
      (opts?.pitchLensId ? ` (lens: ${opts.pitchLensId})` : ''),
    );
    return { id: pres.id };
  }

  /**
   * Fork a presentation — copy slide structure with optional Brief/Lens overrides.
   * Sets status to DRAFT so content can be regenerated with new context.
   */
  async fork(
    id: string,
    userId: string,
    overrides?: { briefId?: string | null; pitchLensId?: string | null; title?: string },
  ): Promise<PresentationWithSlides> {
    const original = await this.prisma.presentation.findUnique({
      where: { id },
      include: { slides: { orderBy: { slideNumber: 'asc' } } },
    });

    if (!original) {
      throw new NotFoundException(`Presentation with id "${id}" not found`);
    }

    if (original.userId !== userId) {
      throw new ForbiddenException('You do not have access to this presentation');
    }

    const forked = await this.prisma.$transaction(async (tx) => {
      const pres = await tx.presentation.create({
        data: {
          title: overrides?.title ?? `${original.title} (reused)`,
          description: original.description,
          sourceContent: original.sourceContent,
          presentationType: original.presentationType,
          status: PresentationStatus.DRAFT,
          themeId: original.themeId,
          imageCount: 0,
          briefId: overrides?.briefId !== undefined ? overrides.briefId : original.briefId,
          pitchLensId: overrides?.pitchLensId !== undefined ? overrides.pitchLensId : original.pitchLensId,
          forkedFromId: original.id,
          userId,
        },
      });

      const slideData = original.slides.map((s) => ({
        presentationId: pres.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imagePrompt: s.imagePrompt,
      }));

      await tx.slide.createMany({ data: slideData });

      return tx.presentation.findUniqueOrThrow({
        where: { id: pres.id },
        include: { slides: { orderBy: { slideNumber: 'asc' } } },
      });
    });

    this.logger.log(
      `Forked presentation ${id} → ${forked.id} for user ${userId}` +
      (overrides?.briefId ? ` (brief: ${overrides.briefId})` : '') +
      (overrides?.pitchLensId ? ` (lens: ${overrides.pitchLensId})` : ''),
    );

    return {
      ...forked,
      slides: forked.slides.map((s) => ({
        id: s.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes,
        slideType: s.slideType,
        imageUrl: s.imageUrl,
        imagePrompt: s.imagePrompt,
        imageSource: s.imageSource,
        figmaFileKey: s.figmaFileKey,
        figmaNodeId: s.figmaNodeId,
        figmaNodeName: s.figmaNodeName,
        previewUrl: s.previewUrl,
        createdAt: s.createdAt,
      })),
    };
  }

  // ── Private Helpers ───────────────────────────────────────

  /**
   * Resolve a theme ID. If none provided, look up the default theme.
   */
  private async resolveThemeId(themeId?: string): Promise<string> {
    if (themeId) {
      const theme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!theme) {
        throw new BadRequestException(`Theme with id "${themeId}" not found`);
      }

      return theme.id;
    }

    // Look up default theme
    const defaultTheme = await this.prisma.theme.findUnique({
      where: { name: DEFAULT_THEME_NAME },
    });

    if (!defaultTheme) {
      // Fall back to any built-in theme
      const anyTheme = await this.prisma.theme.findFirst({
        where: { isBuiltIn: true },
      });

      if (!anyTheme) {
        throw new BadRequestException(
          'No themes available. Please create at least one theme before creating presentations.',
        );
      }

      return anyTheme.id;
    }

    return defaultTheme.id;
  }

  /**
   * Validate each slide definition against density constraints.
   * Auto-fixes violations by splitting dense slides.
   */
  private validateAndFixSlides(
    slides: SlideDefinition[],
    themeColors?: { primary: string; secondary: string; accent: string; background: string; text: string; headingFont?: string; bodyFont?: string },
  ): SlideDefinition[] {
    const fixedSlides: SlideDefinition[] = [];

    for (const slide of slides) {
      const slideContent: SlideContent = {
        title: slide.title,
        body: slide.body,
      };

      const densityResult = this.constraints.validateDensity(slideContent);

      if (!densityResult.valid) {
        // Use constraints service auto-fix
        const fixResult = this.constraints.autoFixSlide(slideContent, {
          palette: {
            primary: themeColors?.primary ?? '#f97316',
            secondary: themeColors?.secondary ?? '#a1a1a1',
            accent: themeColors?.accent ?? '#fbbf24',
            background: themeColors?.background ?? '#1c1c1c',
            text: themeColors?.text ?? '#fcfbf8',
          },
          headingFont: themeColors?.headingFont ?? 'Montserrat',
          bodyFont: themeColors?.bodyFont ?? 'Inter',
        });

        if (fixResult.fixed && fixResult.slides.length > 1) {
          // Map split results back to SlideDefinitions
          for (const splitSlide of fixResult.slides) {
            fixedSlides.push({
              ...slide,
              title: splitSlide.title,
              body: splitSlide.body,
            });
          }
          this.logger.debug(
            `Auto-split slide "${slide.title}" into ${fixResult.slides.length} slides`,
          );
        } else {
          fixedSlides.push(slide);
        }
      } else {
        fixedSlides.push(slide);
      }
    }

    // Renumber all slides
    return fixedSlides.map((slide, index) => ({
      ...slide,
      slideNumber: index + 1,
    }));
  }

  /**
   * Queue image generation jobs for a subset of slides.
   * Selects slides that benefit most from images.
   */
  private async queueImageGeneration(
    presentationId: string,
    slides: Array<{ id: string; slideType: SlideType; imagePrompt: string | null }>,
    imageCount: number,
  ): Promise<void> {
    // Prioritize slide types that benefit from images
    const typePriority: Record<string, number> = {
      [SlideType.TITLE]: 10,
      [SlideType.PROBLEM]: 8,
      [SlideType.SOLUTION]: 8,
      [SlideType.ARCHITECTURE]: 9,
      [SlideType.DATA_METRICS]: 7,
      [SlideType.CTA]: 6,
      [SlideType.COMPARISON]: 5,
      [SlideType.PROCESS]: 5,
      [SlideType.QUOTE]: 4,
      [SlideType.CONTENT]: 3,
    };

    // Sort slides by image priority
    const prioritizedSlides = [...slides]
      .filter((s) => s.imagePrompt !== null)
      .sort((a, b) => {
        const priorityA = typePriority[a.slideType] ?? 0;
        const priorityB = typePriority[b.slideType] ?? 0;
        return priorityB - priorityA;
      })
      .slice(0, imageCount);

    // Create image jobs
    const imageJobData = prioritizedSlides.map((slide) => ({
      slideId: slide.id,
      status: JobStatus.QUEUED,
      prompt: slide.imagePrompt ?? '',
      creditsUsed: 1,
    }));

    if (imageJobData.length > 0) {
      await this.prisma.imageJob.createMany({ data: imageJobData });
      this.logger.log(
        `Queued ${imageJobData.length} image generation jobs for presentation ${presentationId}`,
      );
    }
  }

  /**
   * Queue export jobs for the specified formats.
   */
  private async queueExportJobs(
    presentationId: string,
    formats: string[],
    emailTo?: string,
  ): Promise<Array<{ id: string; format: ExportFormat; status: JobStatus }>> {
    const validFormats = formats.filter(
      (f): f is ExportFormat => Object.values(ExportFormat).includes(f as ExportFormat),
    );

    if (validFormats.length === 0) {
      throw new BadRequestException(
        `No valid export formats provided. Valid formats: ${Object.values(ExportFormat).join(', ')}`,
      );
    }

    // Fetch presentation metadata for email subject/body
    const presentation = emailTo
      ? await this.prisma.presentation.findUnique({
          where: { id: presentationId },
          select: { title: true, slides: { select: { id: true } } },
        })
      : null;

    const jobs: Array<{ id: string; format: ExportFormat; status: JobStatus }> = [];

    for (const format of validFormats) {
      const job = await this.prisma.exportJob.create({
        data: {
          presentationId,
          format,
          status: JobStatus.QUEUED,
        },
      });

      if (emailTo && this.emailService.isConfigured && presentation) {
        // Export + email: await the buffer and send
        void this.processExportAndEmail(
          job.id,
          emailTo,
          presentation.title,
          presentation.slides.length,
          format,
        ).catch((err: unknown) => {
          this.logger.error(`Export+email job ${job.id} failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else {
        // Fire-and-forget: trigger actual export processing
        void this.exportsService.processExport(job.id).catch((err: unknown) => {
          this.logger.error(`Export job ${job.id} failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }

      jobs.push({
        id: job.id,
        format: job.format,
        status: job.status,
      });
    }

    this.logger.log(
      `Queued ${jobs.length} export jobs for presentation ${presentationId}: ${validFormats.join(', ')}${emailTo ? ` (email → ${emailTo})` : ''}`,
    );

    return jobs;
  }

  /**
   * Process an export job and email the result to the specified address.
   */
  private async processExportAndEmail(
    jobId: string,
    emailTo: string,
    title: string,
    slideCount: number,
    format: ExportFormat,
  ): Promise<void> {
    const buffer = await this.exportsService.processExportAndGetBuffer(jobId);

    const ext = format.toLowerCase();
    const filename = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 60)}.${ext}`;
    const html = this.emailService.buildPresentationEmailHtml(title, slideCount, ext);

    const result = await this.emailService.sendEmail({
      to: emailTo,
      subject: `Your presentation: ${title}`,
      html,
      attachments: [{ filename, content: buffer.toString('base64') }],
    });

    if (result.success) {
      this.logger.log(`Emailed export ${jobId} (${format}) to ${emailTo}`);
    } else {
      this.logger.error(`Failed to email export ${jobId}: ${result.error}`);
    }
  }
}
