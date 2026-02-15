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

    const [items, total] = await Promise.all([
      this.prisma.presentation.findMany({
        where,
        orderBy: opts.sort === 'trending' ? { viewCount: 'desc' } : { publishedAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          title: true,
          description: true,
          presentationType: true,
          publishedAt: true,
          createdAt: true,
          imageCount: true,
          viewCount: true,
          forkCount: true,
          _count: { select: { slides: true } },
          user: { select: { name: true } },
          theme: { select: { displayName: true, primaryColor: true } },
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
        slideCount: p._count.slides,
        authorName: p.user.name,
        themeName: p.theme.displayName,
        themeColor: p.theme.primaryColor,
        viewCount: p.viewCount,
        forkCount: p.forkCount,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
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
}
