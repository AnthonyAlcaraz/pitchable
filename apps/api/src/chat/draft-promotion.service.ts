import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeSlideHash } from '../common/content-hash.js';

@Injectable()
export class DraftPromotionService {
  private readonly logger = new Logger(DraftPromotionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Promote a DraftSlide to a real Slide.
   * Called after quality gates pass.
   */
  async promoteDraft(draftSlideId: string): Promise<string> {
    const draft = await this.prisma.draftSlide.findUniqueOrThrow({
      where: { id: draftSlideId },
    });

    const contentHash = computeSlideHash(
      draft.title,
      draft.body,
      draft.speakerNotes,
      draft.slideType,
      null, // imageUrl not known at promotion time
    );

    const slide = await this.prisma.slide.create({
      data: {
        presentationId: draft.presentationId,
        slideNumber: draft.slideNumber,
        title: draft.title,
        body: draft.body,
        speakerNotes: draft.speakerNotes,
        slideType: draft.slideType,
        imagePrompt: draft.imagePrompt,
        sectionLabel: draft.sectionLabel,
        contentHash,
      },
    });

    // Delete the draft after successful promotion
    await this.prisma.draftSlide.delete({ where: { id: draftSlideId } });

    this.logger.log(`Promoted draft ${draftSlideId} → slide ${slide.id}`);
    return slide.id;
  }

  /**
   * Promote all drafts for a presentation in order.
   * Returns array of new Slide IDs.
   */
  async promoteAllDrafts(presentationId: string): Promise<string[]> {
    const drafts = await this.prisma.draftSlide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
    });

    const slideIds: string[] = [];
    for (const draft of drafts) {
      const slideId = await this.promoteDraft(draft.id);
      slideIds.push(slideId);
    }

    return slideIds;
  }

  /**
   * Clean up stale drafts older than 1 hour.
   */
  async cleanupStaleDrafts(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const result = await this.prisma.draftSlide.deleteMany({
      where: { createdAt: { lt: oneHourAgo } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} stale draft slide(s)`);
    }
    return result.count;
  }
}
