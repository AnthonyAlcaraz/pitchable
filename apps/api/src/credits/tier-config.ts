export interface TierLimits {
  maxDecksPerMonth: number | null; // null = unlimited
  maxSlidesPerDeck: number | null; // null = unlimited, FREE = 4 sample slides
  creditsPerMonth: number; // total monthly credit allocation (shared: decks + images)
  maxBriefs: number | null; // null = unlimited, FREE = 1
  maxLenses: number; // total lenses per user (not monthly)
  maxCustomGuidanceLength: number; // max chars for lens customGuidance field
  maxDocumentSizeMb: number; // max file size per document in MB
  maxDocumentsPerBrief: number | null; // null = unlimited
  maxTotalIngestionMb: number | null; // null = unlimited, total storage across all briefs
}

/**
 * Credit economics (revised 2026-02-21):
 *
 * Models: Sonnet 4.6 ($3/$15/MTok), Haiku 4.5 ($0.80/$4/MTok), Nano Banana Pro ($0.134/img)
 *
 * Cost per 12-slide deck (LLM):
 *   Outline (Sonnet):       ~$0.017
 *   Slide gen (Sonnet+Haiku, cached): ~$0.066
 *   Content reviewer (Haiku): ~$0.008
 *   Quality agents (Sonnet+Haiku): ~$0.12
 *   Intent classifier (Haiku): ~$0.001
 *   Total LLM:              ~$0.21
 *
 * Cost per image: ~$0.134 (Nano Banana Pro) + ~$0.001 critic (Haiku) = ~$0.135
 * Cost per illustrated deck (5 images): ~$0.21 + $0.675 = ~$0.89
 *
 * Credit value: 1 credit = $0.25 user-facing
 * Free signup gift: 5 credits = $1.25 value (sample only, incentivizes upgrade)
 *   → Path A: outline (1) + deck (2) + 2 images (2) = 5 credits (no docs)
 *   → Path B: doc (1) + entities (1) + outline (1) + deck (2) = 5 credits (no images)
 *   → Either way: see the product, can't get the full experience
 *
 * Credit deductions:
 *   Outline generation: 1 credit
 *   Deck execution: 2 credits (covers slides + review + quality agents)
 *   Slide modification: 1 credit
 *   Image generation: 1 credit per image
 *   Document ingestion: 1 credit per document (flat)
 *   Entity extraction: 1 credit per document (FalkorDB)
 *   Chat message: 1 credit (after 10 free per presentation)
 *   Website crawl: 1 credit per 5 pages
 *   Export: free
 *
 * Pricing (targeting 50%+ margin):
 *   FREE       — 5 credits on signup (one-time), 1 deck max, 4 slides max, sample only
 *   STARTER    — $19/mo → 40 credits (6 illustrated decks, or 13 text-only)
 *   PRO        — $49/mo → 100 credits (16 illustrated, or 33 text-only)
 *   ENTERPRISE — custom → 300 credits
 *
 * Margin at average usage:
 *   STARTER: $19 revenue - ~$6.00 cost = $13 profit (68%)
 *   PRO:     $49 revenue - ~$14 cost  = $35 profit (71%)
 */

/** Credits deducted per outline generation (covers LLM + RAG costs). */
export const OUTLINE_GENERATION_COST = 1;

/** Credits deducted per deck execution after outline approval (covers slides + review + quality agents). */
export const DECK_GENERATION_COST = 2;

/** Credits deducted per single-slide modification or addition. */
export const SLIDE_MODIFICATION_COST = 1;

/** Credits deducted per image generation. */
export const IMAGE_GENERATION_COST = 1;

/** Credits deducted per document entity extraction (Sonnet 4.6 LLM cost). */
export const ENTITY_EXTRACTION_COST = 1;

/** Credits deducted per document ingestion (flat rate regardless of size). */
export const DOCUMENT_INGESTION_COST = 1;

/** Free chat messages allowed per presentation before charging. */
export const FREE_CHAT_MESSAGES_PER_PRESENTATION = 10;

/** Credits deducted per chat message after free allowance. */
export const CHAT_MESSAGE_COST = 1;

/** Credits granted to new free-tier users on signup (sample deck only). */
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
    maxDecksPerMonth: 1, // one sample deck only
    maxSlidesPerDeck: 4, // sample preview only
    creditsPerMonth: 0, // no monthly refresh; one-time 5 credits on signup
    maxBriefs: 1,
    maxLenses: 1,
    maxCustomGuidanceLength: 200,
    maxDocumentSizeMb: 5,
    maxDocumentsPerBrief: 3,
    maxTotalIngestionMb: 10, // 10 MB total across all docs
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
    maxTotalIngestionMb: null, // unlimited
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
    maxTotalIngestionMb: null, // unlimited
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
    maxTotalIngestionMb: null, // unlimited
  },
};
