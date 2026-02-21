import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ChunkScoringService {
  private readonly logger = new Logger(ChunkScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Boost chunks that contributed to an approved/completed deck.
   * Called after deck reaches COMPLETED status.
   */
  async boostChunksForDeck(presentationId: string): Promise<number> {
    const sources = await this.prisma.slideSource.findMany({
      where: { slide: { presentationId } },
      select: { chunkId: true, relevance: true },
    });

    if (sources.length === 0) return 0;

    let updated = 0;
    for (const source of sources) {
      const boost = 0.1 * source.relevance;
      await this.prisma.documentChunk.update({
        where: { id: source.chunkId },
        data: {
          approvalScore: { increment: Math.min(boost, 0.5) },
          usageCount: { increment: 1 },
        },
      });
      updated++;
    }

    // Cap approvalScore at 5.0
    await this.prisma.$executeRawUnsafe(
      `UPDATE "DocumentChunk" SET "approvalScore" = 5.0 WHERE "approvalScore" > 5.0`,
    );

    this.logger.log(
      `Boosted ${updated} chunks for presentation ${presentationId}`,
    );
    return updated;
  }

  /**
   * Penalize chunks from a rejected slide.
   * Called when a slide fails quality review.
   */
  async penalizeChunksForSlide(slideId: string): Promise<number> {
    const sources = await this.prisma.slideSource.findMany({
      where: { slideId },
      select: { chunkId: true },
    });

    if (sources.length === 0) return 0;

    let updated = 0;
    for (const source of sources) {
      await this.prisma.documentChunk.update({
        where: { id: source.chunkId },
        data: {
          approvalScore: { decrement: 0.05 },
        },
      });
      updated++;
    }

    // Floor approvalScore at -1.0
    await this.prisma.$executeRawUnsafe(
      `UPDATE "DocumentChunk" SET "approvalScore" = -1.0 WHERE "approvalScore" < -1.0`,
    );

    this.logger.log(`Penalized ${updated} chunks for slide ${slideId}`);
    return updated;
  }

  /**
   * Adjust retrieval score with approval weight.
   * Called during RAG retrieval to boost well-performing chunks.
   */
  computeWeightedScore(similarity: number, approvalScore: number): number {
    return similarity * (1 + approvalScore * 0.2);
  }
}
