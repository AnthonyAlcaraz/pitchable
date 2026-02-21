import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ThemesService } from '../themes/themes.service.js';
import { TemplateSelectorService } from '../exports/template-selector.service.js';
import type { CreatePitchLensDto } from './dto/create-pitch-lens.dto.js';
import type { UpdatePitchLensDto } from './dto/update-pitch-lens.dto.js';
import type { RecommendFrameworksDto } from './dto/recommend-frameworks.dto.js';
import type { RecommendThemesDto } from './dto/recommend-themes.dto.js';
import { recommendFrameworks } from './frameworks/framework-recommender.js';
import { recommendThemes } from './frameworks/theme-recommender.js';
import {
  getFrameworkConfig,
  getAllFrameworks,
} from './frameworks/story-frameworks.config.js';
import type { StoryFrameworkConfig } from './frameworks/story-frameworks.config.js';
import { ArchetypeResolverService } from './archetypes/archetype-resolver.service.js';
import type { DeckArchetype } from '../../generated/prisma/enums.js';

@Injectable()
export class PitchLensService {
  private readonly logger = new Logger(PitchLensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly themesService: ThemesService,
    private readonly archetypeResolver: ArchetypeResolverService,
    private readonly templateSelector: TemplateSelectorService,
  ) {}

  async create(userId: string, dto: CreatePitchLensDto) {
    // If this is set as default, unset any existing default
    if (dto.isDefault) {
      await this.prisma.pitchLens.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const lens = await this.prisma.pitchLens.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        audienceType: dto.audienceType,
        pitchGoal: dto.pitchGoal,
        industry: dto.industry,
        companyStage: dto.companyStage,
        toneStyle: dto.toneStyle,
        technicalLevel: dto.technicalLevel,
        selectedFramework: dto.selectedFramework,
        customGuidance: dto.customGuidance,
        imageFrequency: dto.imageFrequency,
        imageLayout: dto.imageLayout,
        maxBulletsPerSlide: dto.maxBulletsPerSlide,
        maxWordsPerSlide: dto.maxWordsPerSlide,
        maxTableRows: dto.maxTableRows,
        deckArchetype: dto.deckArchetype,
        showSectionLabels: dto.showSectionLabels ?? false,
        showOutlineSlide: dto.showOutlineSlide ?? false,
        isDefault: dto.isDefault ?? false,
        figmaTemplateId: dto.figmaTemplateId,
      },
    });

    return {
      ...lens,
      framework: getFrameworkConfig(lens.selectedFramework),
    };
  }

  async findAll(userId: string) {
    const lenses = await this.prisma.pitchLens.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: { select: { presentations: true } },
      },
    });

    return lenses.map((lens) => ({
      ...lens,
      presentationCount: lens._count.presentations,
      framework: getFrameworkConfig(lens.selectedFramework),
    }));
  }

  async findOne(id: string, userId: string) {
    const lens = await this.prisma.pitchLens.findUnique({
      where: { id },
      include: {
        presentations: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            presentationType: true,
            updatedAt: true,
          },
        },
        _count: { select: { presentations: true } },
      },
    });

    if (!lens) throw new NotFoundException('Pitch Lens not found');
    if (lens.userId !== userId) throw new ForbiddenException();

    return {
      ...lens,
      presentationCount: lens._count.presentations,
      framework: getFrameworkConfig(lens.selectedFramework),
    };
  }

  async update(id: string, userId: string, dto: UpdatePitchLensDto) {
    const existing = await this.prisma.pitchLens.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pitch Lens not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    // Track if framework was overridden
    const frameworkOverridden =
      dto.selectedFramework && dto.selectedFramework !== existing.selectedFramework
        ? true
        : existing.frameworkOverridden;

    // Handle default toggle
    if (dto.isDefault) {
      await this.prisma.pitchLens.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.pitchLens.update({
      where: { id },
      data: {
        ...dto,
        frameworkOverridden,
      },
    });

    return {
      ...updated,
      framework: getFrameworkConfig(updated.selectedFramework),
    };
  }

  async delete(id: string, userId: string) {
    const existing = await this.prisma.pitchLens.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pitch Lens not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    await this.prisma.pitchLens.delete({ where: { id } });
    return { deleted: true };
  }

  async setDefault(id: string, userId: string) {
    const existing = await this.prisma.pitchLens.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pitch Lens not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    // Unset all defaults, then set this one
    await this.prisma.pitchLens.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.pitchLens.update({
      where: { id },
      data: { isDefault: true },
    });

    return {
      ...updated,
      framework: getFrameworkConfig(updated.selectedFramework),
    };
  }

  getRecommendations(dto: RecommendFrameworksDto) {
    return recommendFrameworks(
      dto.audienceType,
      dto.pitchGoal,
      dto.companyStage,
      dto.technicalLevel,
    );
  }

  getThemeRecommendations(dto: RecommendThemesDto) {
    const themes = this.themesService.getAllThemeMeta();
    return recommendThemes(
      themes,
      dto.audienceType,
      dto.pitchGoal,
      dto.selectedFramework,
    );
  }

  listFrameworks(): StoryFrameworkConfig[] {
    return getAllFrameworks();
  }

  // ── Archetype API ──────────────────────────────────────────

  listArchetypes() {
    return this.archetypeResolver.listArchetypes();
  }

  getArchetypeDetails(archetypeId: string) {
    return this.archetypeResolver.getArchetype(archetypeId as DeckArchetype);
  }

  recommendArchetypes(audienceType: string, pitchGoal: string) {
    return this.archetypeResolver.recommendArchetypes(
      audienceType as import('../../generated/prisma/enums.js').AudienceType,
      pitchGoal as import('../../generated/prisma/enums.js').PitchGoal,
    );
  }

  getArchetypeDefaults(archetypeId: string) {
    return this.archetypeResolver.getDefaults(archetypeId as DeckArchetype);
  }

  /**
   * Get the recommended render engine for a Pitch Lens (for frontend preview).
   */
  async getRecommendedEngine(id: string, userId: string) {
    const lens = await this.prisma.pitchLens.findUnique({
      where: { id },
      include: {
        presentations: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: { themeId: true, theme: { select: { name: true } } },
        },
      },
    });

    if (!lens) throw new NotFoundException('Pitch Lens not found');
    if (lens.userId !== userId) throw new ForbiddenException();

    // Use the most recent presentation's theme, or default
    const themeName = lens.presentations[0]?.theme?.name ?? 'pitchable-dark';
    const themeMeta = this.themesService.getThemeMeta(themeName);

    const selection = this.templateSelector.selectRenderEngine({
      format: 'PPTX',
      themeName,
      themeCategory: themeMeta?.category ?? 'dark',
      defaultLayoutProfile: themeMeta?.defaultLayoutProfile ?? 'startup',
      figmaTemplateId: lens.figmaTemplateId,
      audienceType: lens.audienceType,
      pitchGoal: lens.pitchGoal,
      toneStyle: lens.toneStyle,
      deckArchetype: lens.deckArchetype,
    });

    return {
      engine: selection.engine,
      layoutProfile: selection.layoutProfile,
      reason: selection.reason,
    };
  }

  /**
   * Get the Pitch Lens linked to a presentation (used by context-builder).
   */
  async getLensForPresentation(presentationId: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { pitchLens: true },
    });

    if (!presentation?.pitchLens) return null;

    return {
      ...presentation.pitchLens,
      framework: getFrameworkConfig(presentation.pitchLens.selectedFramework),
    };
  }

  // ── Marketplace ─────────────────────────────────────────────

  /**
   * Browse public lenses. No auth required.
   */
  async browsePublic(options?: {
    sortBy?: 'popular' | 'rated' | 'recent';
    industry?: string;
    audienceType?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      sortBy = 'popular',
      industry,
      audienceType,
      limit = 20,
      offset = 0,
    } = options ?? {};

    const where: Record<string, unknown> = { isPublic: true };
    if (industry) where.industry = industry;
    if (audienceType) where.audienceType = audienceType;

    const orderBy =
      sortBy === 'rated'
        ? { rating: 'desc' as const }
        : sortBy === 'recent'
          ? { createdAt: 'desc' as const }
          : { useCount: 'desc' as const };

    const [lenses, total] = await Promise.all([
      this.prisma.pitchLens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          audienceType: true,
          pitchGoal: true,
          industry: true,
          selectedFramework: true,
          toneStyle: true,
          isPublic: true,
          useCount: true,
          rating: true,
          ratingCount: true,
          createdAt: true,
        },
      }),
      this.prisma.pitchLens.count({ where }),
    ]);

    return { lenses, total, limit, offset };
  }

  /**
   * Clone a public lens for the authenticated user.
   */
  async cloneLens(lensId: string, userId: string) {
    const source = await this.prisma.pitchLens.findUnique({
      where: { id: lensId },
    });

    if (!source) throw new NotFoundException(`Lens ${lensId} not found`);
    if (!source.isPublic && source.userId !== userId) {
      throw new ForbiddenException('Cannot clone a private lens');
    }

    // Increment use count on source
    await this.prisma.pitchLens.update({
      where: { id: lensId },
      data: { useCount: { increment: 1 } },
    });

    // Create clone
    const clone = await this.prisma.pitchLens.create({
      data: {
        userId,
        name: `${source.name} (Copy)`,
        description: source.description,
        audienceType: source.audienceType,
        pitchGoal: source.pitchGoal,
        industry: source.industry,
        companyStage: source.companyStage,
        toneStyle: source.toneStyle,
        technicalLevel: source.technicalLevel,
        selectedFramework: source.selectedFramework,
        maxBulletsPerSlide: source.maxBulletsPerSlide,
        maxWordsPerSlide: source.maxWordsPerSlide,
        maxTableRows: source.maxTableRows,
        imageFrequency: source.imageFrequency,
        imageLayout: source.imageLayout,
        isPublic: false,
        clonedFromId: lensId,
      },
    });

    return clone;
  }

  /**
   * Rate a public lens.
   */
  async rateLens(lensId: string, userId: string, score: number) {
    if (score < 1 || score > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const lens = await this.prisma.pitchLens.findUnique({
      where: { id: lensId },
    });

    if (!lens) throw new NotFoundException(`Lens ${lensId} not found`);
    if (!lens.isPublic)
      throw new ForbiddenException('Cannot rate a private lens');
    if (lens.userId === userId)
      throw new ForbiddenException('Cannot rate your own lens');

    // Rolling average
    const newCount = lens.ratingCount + 1;
    const newRating = (lens.rating * lens.ratingCount + score) / newCount;

    return this.prisma.pitchLens.update({
      where: { id: lensId },
      data: {
        rating: newRating,
        ratingCount: newCount,
      },
    });
  }

  /**
   * Publish a lens to the marketplace (make public).
   */
  async publishLens(lensId: string, userId: string) {
    const lens = await this.prisma.pitchLens.findUnique({
      where: { id: lensId },
    });

    if (!lens) throw new NotFoundException(`Lens ${lensId} not found`);
    if (lens.userId !== userId)
      throw new ForbiddenException('Not your lens');

    return this.prisma.pitchLens.update({
      where: { id: lensId },
      data: { isPublic: true },
    });
  }
}
