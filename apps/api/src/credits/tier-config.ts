export interface TierLimits {
  maxDecksPerMonth: number | null; // null = unlimited
  imageCreditsPerMonth: number;
}

/**
 * Credit economics (smart model routing + Nano Banana Pro):
 *
 * Model routing:
 *   Opus 4.6  ($5/$25 MTok)  — slide content generation (quality-critical)
 *   Sonnet 4.5 ($3/$15 MTok) — outline, chat, slide modification
 *   Haiku 4.5 ($0.80/$4 MTok) — intent classifier, content review
 *
 * Cost per 10-slide deck (LLM): ~$0.243 (down from $0.296 with all-Opus)
 * Cost per image:               ~$0.134 (Nano Banana Pro 2K)
 * Cost per illustrated deck:    ~$0.243 + $1.34 = $1.58
 *
 * Credit value: 1 credit = $0.25 user-facing
 * Free signup gift: 10 credits = $2.50 value
 *   → Enough for 1 full illustrated deck (trial hook)
 *
 * Pricing (optimized for 60%+ margin):
 *   FREE       — 10 credits on signup, 1 deck/month, no monthly refresh
 *   STARTER    — $19/mo → 40 credits/month (~4 illustrated decks)
 *   PRO        — $49/mo → 100 credits/month (~10 decks), unlimited deck count
 *   ENTERPRISE — custom
 *
 * Margin at max usage:
 *   STARTER: $19 revenue - $7.50 cost = $11.50 profit (60%)
 *   PRO:     $49 revenue - $18 cost   = $31 profit (63%)
 *
 * Credit deductions:
 *   Deck generation: 3 credits (covers LLM cost for outline + 10 slides + review)
 *   Image generation: 1 credit per image (covers Nano Banana Pro cost)
 *   Export: free
 */

/** Credits deducted per deck generation (covers LLM costs). */
export const DECK_GENERATION_COST = 3;

/** Credits deducted per image generation. */
export const IMAGE_GENERATION_COST = 1;

/** Credits granted to new free-tier users on signup. */
export const FREE_SIGNUP_CREDITS = 10;

export const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: {
    maxDecksPerMonth: 1,
    imageCreditsPerMonth: 0, // no monthly refresh; one-time 10 credits on signup
  },
  STARTER: {
    maxDecksPerMonth: 10,
    imageCreditsPerMonth: 40,
  },
  PRO: {
    maxDecksPerMonth: null,
    imageCreditsPerMonth: 100,
  },
  ENTERPRISE: {
    maxDecksPerMonth: null,
    imageCreditsPerMonth: 300,
  },
};
