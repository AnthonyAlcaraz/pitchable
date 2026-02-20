import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditsService } from './credits.service.js';
import { CreditReason } from '../../generated/prisma/enums.js';
import { TIER_LIMITS } from './tier-config.js';

export interface DeckLimitResult {
  allowed: boolean;
  reason?: string;
  decksUsed: number;
  decksLimit: number | null;
}

export interface TierStatus {
  tier: string;
  decksUsed: number;
  decksLimit: number | null;
  decksRemaining: number | null;
  creditBalance: number;
  creditsPerMonth: number;
  maxSlidesPerDeck: number | null;
}

@Injectable()
export class TierEnforcementService {
  private readonly logger = new Logger(TierEnforcementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
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
        maxSlidesPerDeck: freeLimits.maxSlidesPerDeck,
      };
    }

    let decksUsed = user.decksThisMonth;
    if (this.isNewMonth(user.monthResetAt)) {
      decksUsed = 0;
    }

    const limits = TIER_LIMITS[user.tier] ?? TIER_LIMITS['FREE'];
    const decksLimit = limits.maxDecksPerMonth;
    const decksRemaining = decksLimit !== null ? Math.max(0, decksLimit - decksUsed) : null;

    return {
      tier: user.tier,
      decksUsed,
      decksLimit,
      decksRemaining,
      creditBalance: user.creditBalance,
      creditsPerMonth: limits.creditsPerMonth,
      maxSlidesPerDeck: limits.maxSlidesPerDeck,
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
