import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GenerationRatingService {
  private readonly logger = new Logger(GenerationRatingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitRating(
    userId: string,
    presentationId: string,
    rating: number,
    comment?: string,
  ) {
    // Auto-populate chat turn count and slide count
    const [chatTurnCount, slideCount] = await Promise.all([
      this.prisma.chatMessage.count({
        where: { presentationId, role: 'user' },
      }),
      this.prisma.slide.count({ where: { presentationId } }),
    ]);

    return this.prisma.generationRating.upsert({
      where: { userId_presentationId: { userId, presentationId } },
      create: {
        userId,
        presentationId,
        rating,
        comment: comment ?? null,
        chatTurnCount,
        slideCount,
      },
      update: {
        rating,
        comment: comment ?? null,
        chatTurnCount,
        slideCount,
      },
    });
  }

  async getRating(presentationId: string) {
    return this.prisma.generationRating.findUnique({
      where: { presentationId },
    });
  }

  /** Fire-and-forget: increment edit count if a rating exists for this presentation. */
  incrementEditCount(presentationId: string): void {
    this.prisma.generationRating
      .update({
        where: { presentationId },
        data: { editCountAfter: { increment: 1 } },
      })
      .catch(() => {
        // No rating exists yet — silently ignore
      });
  }

  /** Fire-and-forget: mark presentation as exported if a rating exists. */
  markExported(presentationId: string): void {
    this.prisma.generationRating
      .update({
        where: { presentationId },
        data: { exported: true },
      })
      .catch(() => {
        // No rating exists yet — silently ignore
      });
  }

  async getInsights(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const ratings = await this.prisma.generationRating.findMany({
      where: { createdAt: { gte: since } },
      include: {
        presentation: {
          select: {
            slides: { select: { slideType: true } },
            theme: { select: { name: true } },
          },
        },
      },
    });

    const totalRated = ratings.length;
    const totalGenerations = await this.prisma.presentation.count({
      where: { createdAt: { gte: since }, status: 'COMPLETED' },
    });

    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let ratingSum = 0;
    let totalEdits = 0;
    let totalChatTurns = 0;
    let chatTurnEntries = 0;
    let exportedCount = 0;

    for (const r of ratings) {
      distribution[String(r.rating)]++;
      ratingSum += r.rating;
      totalEdits += r.editCountAfter;
      if (r.chatTurnCount !== null) {
        totalChatTurns += r.chatTurnCount;
        chatTurnEntries++;
      }
      if (r.exported) exportedCount++;
    }

    // Low-rated patterns: group by slide types present in low-rated decks
    const slideTypeRatings = new Map<string, { sum: number; count: number }>();
    for (const r of ratings) {
      if (!r.presentation?.slides) continue;
      const types = new Set(r.presentation.slides.map((s) => s.slideType));
      for (const t of types) {
        const entry = slideTypeRatings.get(t) ?? { sum: 0, count: 0 };
        entry.sum += r.rating;
        entry.count++;
        slideTypeRatings.set(t, entry);
      }
    }

    const lowRatedPatterns = [...slideTypeRatings.entries()]
      .map(([pattern, { sum, count }]) => ({
        pattern: `slideType:${pattern}`,
        avgRating: Math.round((sum / count) * 10) / 10,
        count,
      }))
      .filter((p) => p.avgRating < 3.5 && p.count >= 3)
      .sort((a, b) => a.avgRating - b.avgRating);

    // Retrial rate from activity events
    const retrialCount = await this.prisma.activityEvent.count({
      where: { eventType: 'generation_retrial', createdAt: { gte: since } },
    });

    return {
      period: `${days}d`,
      totalGenerations,
      totalRated,
      avgRating: totalRated > 0 ? Math.round((ratingSum / totalRated) * 10) / 10 : null,
      ratingDistribution: distribution,
      lowRatedPatterns,
      behavioralSignals: {
        avgEditsPerDeck: totalRated > 0 ? Math.round((totalEdits / totalRated) * 10) / 10 : 0,
        avgChatTurns: chatTurnEntries > 0 ? Math.round((totalChatTurns / chatTurnEntries) * 10) / 10 : 0,
        retrialRate: totalGenerations > 0 ? Math.round((retrialCount / totalGenerations) * 100) / 100 : 0,
        exportRate: totalRated > 0 ? Math.round((exportedCount / totalRated) * 100) / 100 : 0,
      },
    };
  }
}
