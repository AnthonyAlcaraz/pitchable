import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordView(presentationId: string, viewerIp?: string, viewerUserId?: string, referrer?: string) {
    // Debounce: same IP can only count once per hour for same presentation
    if (viewerIp) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await this.prisma.presentationView.findFirst({
        where: {
          presentationId,
          viewerIp,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (existing) return;
    }

    await this.prisma.$transaction([
      this.prisma.presentationView.create({
        data: { presentationId, viewerIp, viewerUserId, referrer },
      }),
      this.prisma.presentation.update({
        where: { id: presentationId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  }

  async getCreatorStats(userId: string) {
    const presentations = await this.prisma.presentation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        forkCount: true,
        isPublic: true,
        publishedAt: true,
        _count: { select: { slides: true } },
      },
      orderBy: { viewCount: 'desc' },
    });

    const totalViews = presentations.reduce((sum, p) => sum + p.viewCount, 0);
    const totalForks = presentations.reduce((sum, p) => sum + p.forkCount, 0);
    const publicCount = presentations.filter((p) => p.isPublic).length;

    // Views over last 30 days grouped by day
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const presentationIds = presentations.map((p) => p.id);

    const dailyViews = presentationIds.length > 0
      ? await this.prisma.presentationView.groupBy({
          by: ['createdAt'],
          where: {
            presentationId: { in: presentationIds },
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: true,
        })
      : [];

    // Aggregate by day
    const viewsByDay: Record<string, number> = {};
    for (const entry of dailyViews) {
      const day = entry.createdAt.toISOString().split('T')[0];
      viewsByDay[day] = (viewsByDay[day] ?? 0) + entry._count;
    }

    // Fill in missing days
    const chartData: Array<{ date: string; views: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      chartData.push({ date: key, views: viewsByDay[key] ?? 0 });
    }

    return {
      totalViews,
      totalForks,
      publicCount,
      totalPresentations: presentations.length,
      topPresentations: presentations.slice(0, 10).map((p) => ({
        id: p.id,
        title: p.title,
        viewCount: p.viewCount,
        forkCount: p.forkCount,
        slideCount: p._count.slides,
        isPublic: p.isPublic,
        publishedAt: p.publishedAt,
      })),
      chartData,
    };
  }

  async incrementForkCount(presentationId: string) {
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { forkCount: { increment: 1 } },
    });
  }
}
