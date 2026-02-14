import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type FeedbackType = 'VIOLATION' | 'CORRECTION' | 'RULE';
export type FeedbackCategory = 'density' | 'typography' | 'concept' | 'style' | 'tone';

export interface LogFeedbackInput {
  userId: string;
  presentationId?: string;
  slideId?: string;
  type: FeedbackType;
  category: FeedbackCategory;
  originalContent?: string;
  correctedContent?: string;
  rule?: string;
}

@Injectable()
export class FeedbackLogService {
  private readonly logger = new Logger(FeedbackLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a feedback entry (violation, correction, or rule).
   */
  async logFeedback(input: LogFeedbackInput): Promise<string> {
    const entry = await this.prisma.feedbackEntry.create({
      data: {
        userId: input.userId,
        presentationId: input.presentationId ?? null,
        slideId: input.slideId ?? null,
        type: input.type,
        category: input.category,
        originalContent: input.originalContent ?? null,
        correctedContent: input.correctedContent ?? null,
        rule: input.rule ?? null,
      },
    });

    this.logger.debug(
      `Logged ${input.type} feedback [${input.category}] for user ${input.userId}`,
    );

    return entry.id;
  }

  /**
   * Log a content review violation.
   */
  async logViolation(
    userId: string,
    presentationId: string,
    slideId: string,
    category: FeedbackCategory,
    description: string,
  ): Promise<void> {
    await this.logFeedback({
      userId,
      presentationId,
      slideId,
      type: 'VIOLATION',
      category,
      originalContent: description,
    });
  }

  /**
   * Log a user correction (original → corrected).
   * Replaces existing similar correction in the same category
   * to keep only 1 correction per user+category (deduplication).
   */
  async logCorrection(
    userId: string,
    presentationId: string,
    slideId: string,
    category: FeedbackCategory,
    original: string,
    corrected: string,
  ): Promise<void> {
    // Find existing correction in the same category with similar content
    const existing = await this.prisma.feedbackEntry.findFirst({
      where: {
        userId,
        type: 'CORRECTION',
        category,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && this.isSimilarCorrection(existing.originalContent ?? '', original)) {
      // Update existing instead of creating duplicate
      await this.prisma.feedbackEntry.update({
        where: { id: existing.id },
        data: {
          presentationId,
          slideId,
          originalContent: original,
          correctedContent: corrected,
          createdAt: new Date(),
        },
      });
      this.logger.debug(
        `Updated existing ${category} correction for user ${userId} (dedup)`,
      );
    } else {
      await this.logFeedback({
        userId,
        presentationId,
        slideId,
        type: 'CORRECTION',
        category,
        originalContent: original,
        correctedContent: corrected,
      });
    }

    // Check if we should codify a rule from repeated corrections
    await this.checkAndCodifyRules(userId, category);
  }

  /**
   * Compare two original-content strings for similarity.
   * Returns true if they share 60%+ overlapping words.
   */
  private isSimilarCorrection(a: string, b: string): boolean {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let overlap = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) overlap++;
    }

    const smaller = Math.min(wordsA.size, wordsB.size);
    return overlap / smaller >= 0.6;
  }

  /**
   * If a user has 3+ similar corrections in the same category,
   * auto-create a RULE entry.
   */
  private async checkAndCodifyRules(
    userId: string,
    category: FeedbackCategory,
  ): Promise<void> {
    const recentCorrections = await this.prisma.feedbackEntry.findMany({
      where: { userId, type: 'CORRECTION', category },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { correctedContent: true },
    });

    if (recentCorrections.length < 3) return;

    // Check if a rule already exists for this category
    const existingRule = await this.prisma.feedbackEntry.findFirst({
      where: { userId, type: 'RULE', category },
      orderBy: { createdAt: 'desc' },
    });

    // Only create a new rule if we don't have a recent one (< 7 days)
    if (existingRule) {
      const daysSince = (Date.now() - existingRule.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Create a rule from the pattern
    const patterns = recentCorrections
      .map((c) => c.correctedContent)
      .filter(Boolean)
      .slice(0, 3);

    const ruleText = `User prefers: ${patterns.join('; ')} (auto-codified from ${recentCorrections.length} corrections in ${category})`;

    await this.logFeedback({
      userId,
      type: 'RULE',
      category,
      rule: ruleText,
    });

    this.logger.log(
      `Auto-codified rule for user ${userId} in category ${category}`,
    );
  }

  /**
   * Get all rules for a user.
   */
  async getRules(userId: string): Promise<Array<{ category: string; rule: string }>> {
    const rules = await this.prisma.feedbackEntry.findMany({
      where: { userId, type: 'RULE' },
      orderBy: { createdAt: 'desc' },
      select: { category: true, rule: true },
    });

    return rules
      .filter((r): r is { category: string; rule: string } => r.rule !== null)
      .map((r) => ({ category: r.category, rule: r.rule }));
  }
}
