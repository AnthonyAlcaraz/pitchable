import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditsService } from './credits.service.js';
import { CreditReservationService } from './credit-reservation.service.js';
import { CreditReason } from '../../generated/prisma/enums.js';
import { TIER_LIMITS, DOCUMENT_INGESTION_COST } from './tier-config.js';

export interface DeckLimitResult {
  allowed: boolean;
  reason?: string;
  decksUsed: number;
  decksLimit: number | null;
}

export interface ResourceLimitResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}

export interface TierStatus {
  tier: string;
  decksUsed: number;
  decksLimit: number | null;
  decksRemaining: number | null;
  creditBalance: number;
  creditsPerMonth: number;
  creditsReserved: number;
  maxSlidesPerDeck: number | null;
  briefsUsed: number;
  briefsLimit: number | null;
  lensesUsed: number;
  lensesLimit: number;
  maxCustomGuidanceLength: number;
  maxDocumentSizeMb: number;
  maxDocumentsPerBrief: number | null;
}

@Injectable()
export class TierEnforcementService {
  private readonly logger = new Logger(TierEnforcementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly reservations: CreditReservationService,
  ) {}

  /**
   * Check if user can create a new deck this month.
   * Resets monthly counter if the month has rolled over.
   */
  async canCreateDeck(userId: string): Promise<DeckLimitResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        decksThisMonth: true,
        monthResetAt: true,
      },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found', decksUsed: 0, decksLimit: 0 };
    }

    // Auto-reset if month rolled over
    let decksUsed = user.decksThisMonth;
    if (this.isNewMonth(user.monthResetAt)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { decksThisMonth: 0, monthResetAt: new Date() },
      });
      decksUsed = 0;
    }

    const limits = TIER_LIMITS[user.tier] ?? TIER_LIMITS['FREE'];
    const decksLimit = limits.maxDecksPerMonth;

    if (decksLimit !== null && decksUsed >= decksLimit) {
      return {
        allowed: false,
        reason: `You've reached your monthly limit of ${decksLimit} decks on the ${user.tier} plan. Upgrade for more.`,
        decksUsed,
        decksLimit,
      };
    }

    return { allowed: true, decksUsed, decksLimit };
  }

  /**
   * Increment the user's monthly deck count.
   */
  async incrementDeckCount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { monthResetAt: true },
    });

    if (user && this.isNewMonth(user.monthResetAt)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { decksThisMonth: 1, monthResetAt: new Date() },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { decksThisMonth: { increment: 1 } },
      });
    }
  }

  /**
   * Check if the user's tier allows image generation.
   */
  canGenerateImages(tier: string): boolean {
    const limits = TIER_LIMITS[tier];
    // FREE tier has 0 monthly credits → no images; paid tiers > 0 → images allowed
    return limits ? limits.creditsPerMonth > 0 : false;
  }

  /**
   * Get the max slides per deck for a tier. Returns null for unlimited.
   */
  getMaxSlidesPerDeck(tier: string): number | null {
    return TIER_LIMITS[tier]?.maxSlidesPerDeck ?? TIER_LIMITS['FREE'].maxSlidesPerDeck;
  }

  /**
   * Get the monthly credit allocation for a tier.
   */
  getMonthlyAllocation(tier: string): number {
    return TIER_LIMITS[tier]?.creditsPerMonth ?? 0;
  }

  /**
   * Allocate monthly credits for subscription renewal.
   */
  async allocateMonthlyCredits(userId: string, tier: string): Promise<void> {
    const allocation = this.getMonthlyAllocation(tier);
    if (allocation <= 0) return;

    await this.credits.addCredits(
      userId,
      allocation,
      CreditReason.SUBSCRIPTION_RENEWAL,
    );

    this.logger.log(
      `Allocated ${allocation} monthly credits to user ${userId} (${tier} tier)`,
    );
  }

  /**
   * Check if user can create a new Pitch Brief.
   * Returns limit = -1 when unlimited (null in config).
   */
  async canCreateBrief(userId: string): Promise<ResourceLimitResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const tier = user?.tier ?? 'FREE';
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['FREE'];
    const used = await this.prisma.pitchBrief.count({ where: { userId } });

    if (limits.maxBriefs !== null && used >= limits.maxBriefs) {
      return {
        allowed: false,
        reason: `You've reached the limit of ${limits.maxBriefs} brief${limits.maxBriefs === 1 ? '' : 's'} on the ${tier} plan. Upgrade for more.`,
        used,
        limit: limits.maxBriefs,
      };
    }
    return { allowed: true, used, limit: limits.maxBriefs ?? -1 };
  }

  /**
   * Check if user can create a new Pitch Lens.
   */
  async canCreateLens(userId: string): Promise<ResourceLimitResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const tier = user?.tier ?? 'FREE';
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['FREE'];
    const used = await this.prisma.pitchLens.count({ where: { userId } });

    if (used >= limits.maxLenses) {
      return {
        allowed: false,
        reason: `You've reached the limit of ${limits.maxLenses} lens${limits.maxLenses === 1 ? '' : 'es'} on the ${tier} plan. Upgrade for more.`,
        used,
        limit: limits.maxLenses,
      };
    }
    return { allowed: true, used, limit: limits.maxLenses };
  }

  /**
   * Check if user can upload a document to a brief (file size + doc count + credits).
   */
  async canUploadDocument(
    userId: string,
    briefId: string,
    fileSizeBytes: number,
  ): Promise<{ allowed: boolean; reason?: string; creditCost: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, creditBalance: true },
    });
    const tier = user?.tier ?? 'FREE';
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['FREE'];

    // Check file size
    const fileSizeMb = fileSizeBytes / (1024 * 1024);
    if (fileSizeMb > limits.maxDocumentSizeMb) {
      return {
        allowed: false,
        reason: `File exceeds the ${limits.maxDocumentSizeMb} MB limit on the ${tier} plan. Upgrade for larger files.`,
        creditCost: 0,
      };
    }

    // Check document count per brief
    if (limits.maxDocumentsPerBrief !== null) {
      const docCount = await this.prisma.document.count({ where: { briefId } });
      if (docCount >= limits.maxDocumentsPerBrief) {
        return {
          allowed: false,
          reason: `This brief already has ${limits.maxDocumentsPerBrief} document${limits.maxDocumentsPerBrief === 1 ? '' : 's'} (${tier} plan limit). Upgrade for more.`,
          creditCost: 0,
        };
      }
    }

    // Check credits (flat 1 credit per document)
    if ((user?.creditBalance ?? 0) < DOCUMENT_INGESTION_COST) {
      return {
        allowed: false,
        reason: `Document ingestion costs ${DOCUMENT_INGESTION_COST} credit. You have ${user?.creditBalance ?? 0}. Top up or upgrade.`,
        creditCost: DOCUMENT_INGESTION_COST,
      };
    }

    return { allowed: true, creditCost: DOCUMENT_INGESTION_COST };
  }

  /**
   * Get max document file size in MB for a tier.
   */
  getMaxDocumentSizeMb(tier: string): number {
    return TIER_LIMITS[tier]?.maxDocumentSizeMb ?? TIER_LIMITS['FREE'].maxDocumentSizeMb;
  }

  /**
   * Get max custom guidance length for a tier.
   */
  getMaxCustomGuidanceLength(tier: string): number {
    return TIER_LIMITS[tier]?.maxCustomGuidanceLength ?? TIER_LIMITS['FREE'].maxCustomGuidanceLength;
  }

  /**
   * Get full tier status for a user.
   */
  async getTierStatus(userId: string): Promise<TierStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        creditBalance: true,
        decksThisMonth: true,
        monthResetAt: true,
      },
    });

    if (!user) {
      const freeLimits = TIER_LIMITS['FREE'];
      return {
        tier: 'FREE',
        decksUsed: 0,
        decksLimit: freeLimits.maxDecksPerMonth,
        decksRemaining: freeLimits.maxDecksPerMonth,
        creditBalance: 0,
        creditsPerMonth: freeLimits.creditsPerMonth,
        creditsReserved: 0,
        maxSlidesPerDeck: freeLimits.maxSlidesPerDeck,
        briefsUsed: 0,
        briefsLimit: freeLimits.maxBriefs,
        lensesUsed: 0,
        lensesLimit: freeLimits.maxLenses,
        maxCustomGuidanceLength: freeLimits.maxCustomGuidanceLength,
        maxDocumentSizeMb: freeLimits.maxDocumentSizeMb,
        maxDocumentsPerBrief: freeLimits.maxDocumentsPerBrief,
      };
    }

    let decksUsed = user.decksThisMonth;
    if (this.isNewMonth(user.monthResetAt)) {
      decksUsed = 0;
    }

    const limits = TIER_LIMITS[user.tier] ?? TIER_LIMITS['FREE'];
    const decksLimit = limits.maxDecksPerMonth;
    const decksRemaining = decksLimit !== null ? Math.max(0, decksLimit - decksUsed) : null;

    const [creditsReserved, briefsUsed, lensesUsed] = await Promise.all([
      this.reservations.getReservedAmount(userId),
      this.prisma.pitchBrief.count({ where: { userId } }),
      this.prisma.pitchLens.count({ where: { userId } }),
    ]);

    return {
      tier: user.tier,
      decksUsed,
      decksLimit,
      decksRemaining,
      creditBalance: user.creditBalance,
      creditsPerMonth: limits.creditsPerMonth,
      creditsReserved,
      maxSlidesPerDeck: limits.maxSlidesPerDeck,
      briefsUsed,
      briefsLimit: limits.maxBriefs,
      lensesUsed,
      lensesLimit: limits.maxLenses,
      maxCustomGuidanceLength: limits.maxCustomGuidanceLength,
      maxDocumentSizeMb: limits.maxDocumentSizeMb,
      maxDocumentsPerBrief: limits.maxDocumentsPerBrief,
    };
  }

  private isNewMonth(monthResetAt: Date): boolean {
    const now = new Date();
    return (
      now.getFullYear() !== monthResetAt.getFullYear() ||
      now.getMonth() !== monthResetAt.getMonth()
    );
  }
}
