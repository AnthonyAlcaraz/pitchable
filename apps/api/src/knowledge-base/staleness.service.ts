import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StalenessService {
  private readonly logger = new Logger(StalenessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find slides that reference chunks from a specific document.
   * Used to identify slides that may need regeneration when a document is re-uploaded.
   */
  async findAffectedSlides(documentId: string): Promise<Array<{
    slideId: string;
    presentationId: string;
    slideTitle: string;
    chunkCount: number;
  }>> {
    const affected = await this.prisma.slideSource.findMany({
      where: {
        chunk: { documentId },
      },
      select: {
        slideId: true,
        slide: {
          select: {
            title: true,
            presentationId: true,
          },
        },
      },
    });

    // Group by slide
    const slideMap = new Map<string, { presentationId: string; title: string; count: number }>();
    for (const record of affected) {
      const existing = slideMap.get(record.slideId);
      if (existing) {
        existing.count++;
      } else {
        slideMap.set(record.slideId, {
          presentationId: record.slide.presentationId,
          title: record.slide.title,
          count: 1,
        });
      }
    }

    return Array.from(slideMap.entries()).map(([slideId, data]) => ({
      slideId,
      presentationId: data.presentationId,
      slideTitle: data.title,
      chunkCount: data.count,
    }));
  }
}
