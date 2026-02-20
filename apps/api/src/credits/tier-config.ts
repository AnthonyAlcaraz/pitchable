export interface TierLimits {
  maxDecksPerMonth: number | null; // null = unlimited
  maxSlidesPerDeck: number | null; // null = unlimited, FREE = 4 sample slides
  creditsPerMonth: number; // total monthly credit allocation (shared: decks + images)
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
 *   FREE       — 5 credits on signup (one-time), 2 decks max, 4 slides max, no images
 *   STARTER    — $19/mo → 40 credits/month (10 decks, 15 slides, ~20 images)
 *   PRO        — $49/mo → 100 credits/month (up to 50 decks, unlimited slides, ~100 images)
 *   ENTERPRISE — custom
 *
 * Credits are SHARED between decks and images:
 *   STARTER: 10 decks × 2 = 20 credits + 20 images × 1 = 20 credits = 40 total
 *   PRO:     25 decks × 2 = 50 credits + 50 images × 1 = 50 credits = 100 total
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

/** Credits deducted per document entity extraction (Sonnet 4.6 LLM cost). */
export const ENTITY_EXTRACTION_COST = 1;

/** Credits granted to new free-tier users on signup. */
export const FREE_SIGNUP_CREDITS = 5;

export interface CreditPack {
  id: string;
  credits: number;
  priceCents: number;
  label: string;
}

/**
 * One-time credit top-up packs. Priced above plan rates to incentivize upgrades.
 *
 *   Pack    $/credit   vs STARTER ($0.475)   vs PRO ($0.49)
 *   10cr    $0.80      +68%                  +63%
 *   25cr    $0.60      +26%                  +22%
 *   50cr    $0.50      +5%                   +2%
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_10', credits: 10, priceCents: 799, label: '10 Credits' },
  { id: 'pack_25', credits: 25, priceCents: 1499, label: '25 Credits' },
  { id: 'pack_50', credits: 50, priceCents: 2499, label: '50 Credits' },
];

export const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: {
    maxDecksPerMonth: 2,
    maxSlidesPerDeck: 4, // sample preview only
    creditsPerMonth: 0, // no monthly refresh; one-time 5 credits on signup
  },
  STARTER: {
    maxDecksPerMonth: 10,
    maxSlidesPerDeck: 15,
    creditsPerMonth: 40,
  },
  PRO: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    creditsPerMonth: 100,
  },
  ENTERPRISE: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    creditsPerMonth: 300,
  },
};
