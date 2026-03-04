import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PresentationStatus } from '../../generated/prisma/enums.js';
import type { PresentationType } from '../../generated/prisma/enums.js';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPresentations(opts: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    sort?: 'recent' | 'trending';
    theme?: string;
  }) {
    const where: Record<string, unknown> = {
      isPublic: true,
      status: PresentationStatus.COMPLETED,
    };

    if (opts.search) {
      where['title'] = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts.type) {
      where['presentationType'] = opts.type as PresentationType;
    }
    if (opts.theme) {
      where['theme'] = { name: opts.theme };
    }

    const orderBy = opts.sort === 'trending'
      ? [{ featured: 'desc' as const }, { viewCount: 'desc' as const }]
      : [{ featured: 'desc' as const }, { publishedAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.presentation.findMany({
        where,
        orderBy,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          title: true,
          description: true,
          presentationType: true,
          featured: true,
          publishedAt: true,
          createdAt: true,
          imageCount: true,
          viewCount: true,
          forkCount: true,
          _count: { select: { slides: true } },
          user: { select: { name: true } },
          theme: { select: { displayName: true, primaryColor: true } },
          slides: {
            orderBy: { slideNumber: 'asc' as const },
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.prisma.presentation.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        presentationType: p.presentationType,
        featured: p.featured,
        slideCount: p._count.slides,
        authorName: p.user.name,
        themeName: p.theme.displayName,
        themeColor: p.theme.primaryColor,
        viewCount: p.viewCount,
        forkCount: p.forkCount,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        firstSlideId: p.slides[0]?.id ?? null,
      })),
      total,
      page: opts.page,
      pageCount: Math.ceil(total / opts.limit),
    };
  }

  async getPublicPresentation(id: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      include: {
        slides: { orderBy: { slideNumber: 'asc' } },
        user: { select: { name: true } },
        theme: { select: { id: true, name: true, displayName: true, primaryColor: true, colorPalette: true, headingFont: true, bodyFont: true } },
        pitchLens: { select: { name: true, audienceType: true, pitchGoal: true } },
      },
    });

    if (!presentation || !presentation.isPublic) {
      throw new NotFoundException('Presentation not found');
    }

    return {
      id: presentation.id,
      title: presentation.title,
      description: presentation.description,
      presentationType: presentation.presentationType,
      authorName: presentation.user.name,
      theme: {
        id: presentation.theme.id,
        name: presentation.theme.name,
        displayName: presentation.theme.displayName,
        primaryColor: presentation.theme.primaryColor,
        colorPalette: presentation.theme.colorPalette as Record<string, string>,
        headingFont: presentation.theme.headingFont,
        bodyFont: presentation.theme.bodyFont,
      },
      pitchLens: presentation.pitchLens
        ? {
            name: presentation.pitchLens.name,
            audienceType: presentation.pitchLens.audienceType,
            pitchGoal: presentation.pitchLens.pitchGoal,
          }
        : null,
      slides: presentation.slides.map((s) => ({
        id: s.id,
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        slideType: s.slideType,
        imageUrl: s.imageUrl,
      })),
    };
  }

  async listPublicLenses(opts: { page: number; limit: number }) {
    const where = { isPublic: true };

    const [items, total] = await Promise.all([
      this.prisma.pitchLens.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          name: true,
          audienceType: true,
          pitchGoal: true,
          selectedFramework: true,
          _count: { select: { presentations: true } },
        },
      }),
      this.prisma.pitchLens.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        id: l.id,
        name: l.name,
        audienceType: l.audienceType,
        pitchGoal: l.pitchGoal,
        framework: l.selectedFramework,
        presentationCount: l._count.presentations,
      })),
      total,
      page: opts.page,
      pageCount: Math.ceil(total / opts.limit),
    };
  }

  async getStats() {
    const [totalPresentations, totalUsers, totalSlides] = await Promise.all([
      this.prisma.presentation.count({
        where: { isPublic: true, status: PresentationStatus.COMPLETED },
      }),
      this.prisma.user.count(),
      this.prisma.slide.count(),
    ]);
    return { totalPresentations, totalUsers, totalSlides };
  }

  async forkPublicPresentation(presentationId: string, userId: string) {
    const original = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { slides: { orderBy: { slideNumber: 'asc' } } },
    });

    if (!original || !original.isPublic) {
      throw new NotFoundException('Presentation not found');
    }

    // Resolve default theme
    const defaultTheme = await this.prisma.theme.findFirst({ orderBy: { createdAt: 'asc' } });
    const themeId = defaultTheme?.id ?? original.themeId;

    const forked = await this.prisma.$transaction(async (tx) => {
      const pres = await tx.presentation.create({
        data: {
          title: `${original.title} (template)`,
          description: original.description,
          sourceContent: original.sourceContent,
          presentationType: original.presentationType,
          status: PresentationStatus.DRAFT,
          themeId,
          imageCount: 0,
          briefId: null,
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
      }));

      await tx.slide.createMany({ data: slideData });

      return tx.presentation.findUniqueOrThrow({
        where: { id: pres.id },
        select: { id: true },
      });
    });

    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { forkCount: { increment: 1 } },
    });

    return { id: forked.id };
  }

  // ── Gallery Seed (one-time) ──────────────────────────────────
  async seedGallery(contentSets: Record<string, Record<string, { title: string; body: string }>>) {
    const GALLERY_EMAIL = 'gallery@pitchable.ai';
    const THEME_CONTENT_SET: Record<string, string> = {
      'pitchable-dark': 'A', 'technical-teal': 'A', 'stripe-fintech': 'A', 'z4-dark-premium': 'A',
      'mckinsey-executive': 'B', 'bcg-strategy': 'B', 'sequoia-capital': 'B', 'corporate-blue': 'B',
      'creative-warm': 'C', 'airbnb-story': 'C', 'ted-talk': 'C', 'apple-keynote': 'C',
      'dark-professional': 'D', 'light-minimal': 'D', 'yc-startup': 'D', 'academic-research': 'D',
    };
    const TITLES: Record<string, string> = {
      A: 'DevOps Platform — Investor Pitch',
      B: 'Strategic Transformation — Executive Brief',
      C: 'Creator Economy — Growth Story',
      D: 'AI Research Platform — Technical Overview',
    };
    const PRES_TYPES: Record<string, string> = { A: 'TECHNICAL', B: 'EXECUTIVE', C: 'STANDARD', D: 'ACADEMIC' };

    const ALL_SLIDE_TYPES = [
      'TITLE','PROBLEM','SOLUTION','ARCHITECTURE','PROCESS','COMPARISON','DATA_METRICS','CTA',
      'CONTENT','QUOTE','VISUAL_HUMOR','OUTLINE','TEAM','TIMELINE','SECTION_DIVIDER',
      'METRICS_HIGHLIGHT','FEATURE_GRID','PRODUCT_SHOWCASE','LOGO_WALL','MARKET_SIZING',
      'SPLIT_STATEMENT','MATRIX_2X2','WATERFALL','FUNNEL','COMPETITIVE_MATRIX','ROADMAP',
      'PRICING_TABLE','UNIT_ECONOMICS','SWOT','THREE_PILLARS','HOOK','BEFORE_AFTER',
      'SOCIAL_PROOF','OBJECTION_HANDLER','FAQ','VERDICT','COHORT_TABLE','PROGRESS_TRACKER',
      'FLYWHEEL','REVENUE_MODEL','CUSTOMER_JOURNEY','TECH_STACK','GROWTH_LOOPS','CASE_STUDY',
      'HIRING_PLAN','USE_OF_FUNDS','RISK_MITIGATION','DEMO_SCREENSHOT','MILESTONE_TIMELINE',
      'PARTNERSHIP_LOGOS','FINANCIAL_PROJECTION','GO_TO_MARKET','PERSONA','TESTIMONIAL_WALL',
      'THANK_YOU','SCENARIO_ANALYSIS','VALUE_CHAIN','GEOGRAPHIC_MAP','IMPACT_SCORECARD',
      'EXIT_STRATEGY','ORG_CHART','FEATURE_COMPARISON','DATA_TABLE','ECOSYSTEM_MAP',
      'KPI_DASHBOARD','REFERENCES','ABSTRACT',
    ];

    // Find or create gallery user
    let user = await this.prisma.user.findUnique({ where: { email: GALLERY_EMAIL } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: GALLERY_EMAIL, name: 'Pitchable Gallery', passwordHash: null,
          authProvider: 'local', role: 'ADMIN', tier: 'PRO',
          creditBalance: 99999, emailVerified: true,
        },
      });
    }

    // Delete existing gallery presentations
    const deleted = await this.prisma.presentation.deleteMany({
      where: { userId: user.id, isPublic: true },
    });

    // Load themes
    const themes = await this.prisma.theme.findMany();
    const themeBySlug: Record<string, typeof themes[0]> = {};
    for (const t of themes) themeBySlug[t.name] = t;

    const results: Array<{ id: string; title: string; slides: number }> = [];

    for (const [slug, setKey] of Object.entries(THEME_CONTENT_SET)) {
      const theme = themeBySlug[slug];
      if (!theme) continue;

      const content = contentSets[setKey];
      const presentation = await this.prisma.presentation.create({
        data: {
          title: `${TITLES[setKey]} (${theme.displayName})`,
          description: `Gallery showcase of all slide types using the ${theme.displayName} theme`,
          sourceContent: `Gallery seed for ${theme.displayName}`,
          presentationType: PRES_TYPES[setKey] as any,
          status: 'COMPLETED',
          themeId: theme.id,
          userId: user.id,
          isPublic: true,
          featured: true,
          publishedAt: new Date(),
        },
      });

      const slideData: Array<{
        presentationId: string; slideNumber: number; slideType: any;
        title: string; body: string; imageSource: any;
      }> = [];
      for (let i = 0; i < ALL_SLIDE_TYPES.length; i++) {
        const st = ALL_SLIDE_TYPES[i];
        const c = content[st];
        if (!c) continue;
        slideData.push({
          presentationId: presentation.id,
          slideNumber: i + 1,
          slideType: st as any,
          title: c.title,
          body: c.body,
          imageSource: 'AI_GENERATED' as any,
        });
      }
      await this.prisma.slide.createMany({ data: slideData });
      results.push({ id: presentation.id, title: presentation.title, slides: slideData.length });
    }

    return { deleted: deleted.count, created: results };
  }
}
