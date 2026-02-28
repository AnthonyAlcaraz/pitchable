import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Topic buckets for category derivation
const TOPIC_KEYWORDS: Record<string, string[]> = {
  tech: ['software', 'api', 'cloud', 'data', 'ai', 'machine learning', 'algorithm', 'code', 'platform', 'infrastructure', 'saas', 'devops', 'kubernetes', 'microservices'],
  business: ['revenue', 'growth', 'market', 'strategy', 'expansion', 'partnership', 'stakeholder', 'enterprise', 'b2b', 'sales'],
  finance: ['investment', 'roi', 'funding', 'valuation', 'portfolio', 'fintech', 'banking', 'payment', 'credit', 'capital'],
  health: ['patient', 'clinical', 'healthcare', 'medical', 'biotech', 'pharma', 'wellness', 'diagnosis', 'treatment'],
  education: ['learning', 'student', 'curriculum', 'training', 'course', 'university', 'academic', 'research', 'teaching'],
  energy: ['renewable', 'solar', 'wind', 'battery', 'grid', 'sustainability', 'carbon', 'emissions', 'energy'],
  retail: ['consumer', 'ecommerce', 'shopping', 'inventory', 'supply chain', 'fulfillment', 'retail', 'brand'],
  media: ['content', 'streaming', 'publishing', 'creator', 'audience', 'engagement', 'social media', 'video'],
  manufacturing: ['production', 'factory', 'automation', 'quality', 'lean', 'supply', 'logistics', 'warehouse'],
  general: [], // fallback
};

@Injectable()
export class ImagePoolService {
  private readonly logger = new Logger(ImagePoolService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Try to find a cached image for this category that this user hasn't seen.
   * Returns null if no suitable cached image exists.
   */
  async findCachedImage(category: string, userId: string): Promise<{ id: string; s3Key: string; prompt: string } | null> {
    // Find images in this category that this user hasn't been served
    const image = await this.prisma.imagePool.findFirst({
      where: {
        category,
        usages: {
          none: { userId },
        },
      },
      orderBy: [
        { usageCount: 'asc' },  // Prefer least-used images for variety
        { createdAt: 'asc' },
      ],
      select: { id: true, s3Key: true, prompt: true },
    });

    if (image) {
      this.logger.log(`Cache HIT for category "${category}" (imagePoolId: ${image.id})`);
    } else {
      this.logger.debug(`Cache MISS for category "${category}" (userId: ${userId})`);
    }

    return image;
  }

  /**
   * Add a newly generated image to the pool for future reuse.
   */
  async addToPool(
    category: string,
    s3Key: string,
    prompt: string,
    width = 1280,
    height = 720,
  ): Promise<{ id: string }> {
    const image = await this.prisma.imagePool.create({
      data: { category, s3Key, prompt, width, height },
      select: { id: true },
    });
    this.logger.log(`Added image to pool: category="${category}", id=${image.id}`);
    return image;
  }

  /**
   * Record that a user received this image (prevents re-serving the same image).
   */
  async recordUsage(userId: string, imagePoolId: string, slideId?: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.imageUsage.create({
        data: { userId, imagePoolId, slideId },
      }),
      this.prisma.imagePool.update({
        where: { id: imagePoolId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Derive a category string from slide type and content text.
   * Format: "{slideType}_{topicBucket}" e.g. "SOLUTION_tech", "PROBLEM_finance"
   */
  static deriveCategory(slideType: string, text: string): string {
    const lowerText = text.toLowerCase();
    let bestBucket = 'general';
    let bestCount = 0;

    for (const [bucket, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (bucket === 'general') continue;
      let count = 0;
      for (const kw of keywords) {
        if (lowerText.includes(kw)) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestBucket = bucket;
      }
    }

    return `${slideType}_${bestBucket}`;
  }

  /**
   * Get pool statistics for monitoring.
   */
  async getPoolStats(): Promise<{ totalImages: number; totalUsages: number; categoryCounts: Record<string, number> }> {
    const [totalImages, totalUsages, categories] = await Promise.all([
      this.prisma.imagePool.count(),
      this.prisma.imageUsage.count(),
      this.prisma.imagePool.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const cat of categories) {
      categoryCounts[cat.category] = cat._count;
    }

    return { totalImages, totalUsages, categoryCounts };
  }
}
