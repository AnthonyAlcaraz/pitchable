export interface TierLimits {
  maxDecksPerMonth: number | null; // null = unlimited
  maxSlidesPerDeck: number | null; // null = unlimited, FREE = 4 sample slides
  imageCreditsPerMonth: number;
}

/**
 * Credit economics (all Sonnet 4.6 + Nano Banana Pro):
 *
 * All AI calls use claude-sonnet-4-6 ($3/$15 MTok).
 *
 * Cost per 10-slide deck (LLM): ~$0.24
 * Cost per image:               ~$0.134 (Nano Banana Pro 2K)
 * Cost per illustrated deck:    ~$0.24 + $1.34 = $1.58
 *
 * Credit value: 1 credit = $0.25 user-facing
 * Free signup gift: 5 credits = $1.25 value
 *   → Enough for 2 sample decks (4 slides each, no images)
 *
 * Pricing (optimized for 60%+ margin):
 *   FREE       — 5 credits on signup, 2 decks/month (4 slides max), no images
 *   STARTER    — $19/mo → 40 credits/month (~10 decks, 15 slides max)
 *   PRO        — $49/mo → 100 credits/month (unlimited decks + slides)
 *   ENTERPRISE — custom
 *
 * Margin at average usage:
 *   STARTER: $19 revenue - $7.50 cost = $11.50 profit (60%)
 *   PRO:     $49 revenue - $18 cost   = $31 profit (63%)
 *
 * Credit deductions:
 *   Deck generation: 2 credits (covers LLM cost for outline + slides + review)
 *   Image generation: 1 credit per image (covers Nano Banana Pro cost)
 *   Export: free
 */

/** Credits deducted per deck generation (covers LLM costs). */
export const DECK_GENERATION_COST = 2;

/** Credits deducted per image generation. */
export const IMAGE_GENERATION_COST = 1;

/** Credits granted to new free-tier users on signup. */
export const FREE_SIGNUP_CREDITS = 5;

export const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: {
    maxDecksPerMonth: 2,
    maxSlidesPerDeck: 4, // sample preview only
    imageCreditsPerMonth: 0, // no monthly refresh; one-time 5 credits on signup
  },
  STARTER: {
    maxDecksPerMonth: 10,
    maxSlidesPerDeck: 15,
    imageCreditsPerMonth: 40,
  },
  PRO: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    imageCreditsPerMonth: 100,
  },
  ENTERPRISE: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    imageCreditsPerMonth: 300,
  },
};
