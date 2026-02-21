export interface TierLimits {
  maxDecksPerMonth: number | null; // null = unlimited
  maxSlidesPerDeck: number | null; // null = unlimited, FREE = 4 sample slides
  creditsPerMonth: number; // total monthly credit allocation (shared: decks + images)
  maxBriefs: number | null; // null = unlimited, FREE = 1
  maxLenses: number; // total lenses per user (not monthly)
  maxCustomGuidanceLength: number; // max chars for lens customGuidance field
  maxDocumentSizeMb: number; // max file size per document in MB
  maxDocumentsPerBrief: number | null; // null = unlimited
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
 *   → Enough for 2 sample decks (outline 1 + execute 1 = 2 credits each, no images)
 *   → Plus 1 credit leftover for a slide edit or extra outline
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
 *   Outline generation: 1 credit (covers LLM outline + RAG retrieval)
 *   Deck execution: 1 credit (covers slide generation + review + quality agents)
 *   Slide modification: 1 credit (single slide rewrite/add via LLM)
 *   Image generation: 1 credit per image (covers Nano Banana Pro cost)
 *   Chat message (free-form): 1 credit per 5 messages (rate-limited bucket)
 *   Export: free
 */

/** Credits deducted per outline generation (covers LLM + RAG costs). */
export const OUTLINE_GENERATION_COST = 1;

/** Credits deducted per deck execution after outline approval. */
export const DECK_GENERATION_COST = 1;

/** Credits deducted per single-slide modification or addition. */
export const SLIDE_MODIFICATION_COST = 1;

/** Credits deducted per image generation. */
export const IMAGE_GENERATION_COST = 1;

/** Credits deducted per document entity extraction (Sonnet 4.6 LLM cost). */
export const ENTITY_EXTRACTION_COST = 1;

/**
 * Credits deducted per document ingestion based on file size.
 * 1 credit per 2 MB, minimum 1 credit.
 * Examples: 500KB = 1, 3MB = 2, 10MB = 5, 20MB = 10
 */
export function documentIngestionCost(fileSizeBytes: number): number {
  const mb = fileSizeBytes / (1024 * 1024);
  return Math.max(1, Math.ceil(mb / 2));
}

/** Free chat messages allowed per presentation before charging. */
export const FREE_CHAT_MESSAGES_PER_PRESENTATION = 10;

/** Credits deducted per chat message after free allowance. */
export const CHAT_MESSAGE_COST = 1;

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
    maxBriefs: 1,
    maxLenses: 1,
    maxCustomGuidanceLength: 200,
    maxDocumentSizeMb: 5,
    maxDocumentsPerBrief: 3,
  },
  STARTER: {
    maxDecksPerMonth: 10,
    maxSlidesPerDeck: 15,
    creditsPerMonth: 40,
    maxBriefs: null, // unlimited
    maxLenses: 10,
    maxCustomGuidanceLength: 500,
    maxDocumentSizeMb: 10,
    maxDocumentsPerBrief: null, // unlimited
  },
  PRO: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    creditsPerMonth: 100,
    maxBriefs: null, // unlimited
    maxLenses: 30,
    maxCustomGuidanceLength: 1000,
    maxDocumentSizeMb: 20,
    maxDocumentsPerBrief: null, // unlimited
  },
  ENTERPRISE: {
    maxDecksPerMonth: null,
    maxSlidesPerDeck: null,
    creditsPerMonth: 300,
    maxBriefs: null, // unlimited
    maxLenses: 100,
    maxCustomGuidanceLength: 2000,
    maxDocumentSizeMb: 20,
    maxDocumentsPerBrief: null, // unlimited
  },
};
