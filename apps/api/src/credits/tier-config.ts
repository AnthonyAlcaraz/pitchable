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
 * Credit economics (revised 2026-02-24, all Opus 4.6):
 *
 * Models: Opus 4.6 ($15/$75/MTok, $1.875 cached input), Nano Banana Pro ($0.134/img)
 *
 * Cost per 12-slide deck (LLM):
 *   Outline (Opus):                ~$0.14
 *   Slide gen (Opus x12, cached):  ~$0.76
 *   Content reviewer (Opus):       ~$0.06
 *   Quality agents (Opus):         ~$1.07
 *   Intent classifier (Opus):      ~$0.02
 *   Total LLM:                     ~$2.05
 *
 * Cost per image: ~$0.134 (Nano Banana Pro) + ~$0.01 critic (Opus) = ~$0.14
 * Cost per illustrated deck (5 images): ~$2.05 + $0.70 = ~$2.75
 *
 * Credit value: 1 credit ~= $0.50 user-facing
 * Free signup gift: 5 credits = $2.50 value (sample only, incentivizes upgrade)
 *   → Path A: outline (1) + deck (4) = 5 credits (no images, no docs)
 *   → Path B: doc (1) + entities (1) + outline (1) + deck partial = can't finish
 *   → See the product, must upgrade for full experience
 *
 * Credit deductions:
 *   Outline generation: 1 credit
 *   Deck execution: 4 credits (covers slides + review + quality agents)
 *   Slide modification: 1 credit
 *   Image generation: 1 credit per image
 *   Document ingestion: 1 credit per document (flat)
 *   Entity extraction: 1 credit per document (FalkorDB)
 *   Outline slide edit: 1 credit per slide
 *   Chat message: 1 credit (after 10 free per presentation)
 *   Website crawl: 1 credit per 5 pages
 *   Figma AI mapping: 1 credit per template
 *   Export: free
 *
 * Pricing (targeting 50%+ margin):
 *   FREE       — 5 credits on signup (one-time), 1 deck max, 4 slides max, sample only
 *   STARTER    — $29/mo → 40 credits (4 illustrated decks, or 8 text-only)
 *   PRO        — $79/mo → 100 credits (10 illustrated, or 20 text-only)
 *   ENTERPRISE — custom → 300 credits
 *
 * Margin at average usage:
 *   STARTER: $29 revenue - ~$11 cost = $18 profit (62%)
 *   PRO:     $79 revenue - ~$27 cost = $52 profit (66%)
 */

/** Credits deducted per outline generation (covers LLM + RAG costs). */
export const OUTLINE_GENERATION_COST = 1;

/** Credits deducted per deck execution after outline approval (covers slides + review + quality agents). */
export const DECK_GENERATION_COST = 4;

/** Credits deducted per single-slide modification or addition. */
export const SLIDE_MODIFICATION_COST = 1;

/** Credits deducted per outline slide edit (regenerate a single slide in the outline). */
export const OUTLINE_SLIDE_EDIT_COST = 1;

/** Credits deducted per image generation. */
export const IMAGE_GENERATION_COST = 1;

/** Credits deducted per document entity extraction (Opus 4.6 LLM cost). */
export const ENTITY_EXTRACTION_COST = 1;

/** Credits deducted per Figma AI template mapping (Opus 4.6 vision). */
export const FIGMA_AI_MAPPING_COST = 1;

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
 *   Pack    $/credit   vs STARTER ($0.725)   vs PRO ($0.79)
 *   10cr    $1.30      +79%                  +65%
 *   25cr    $1.00      +38%                  +27%
 *   50cr    $0.80      +10%                  +1%
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_10', credits: 10, priceCents: 1299, label: '10 Credits' },
  { id: 'pack_25', credits: 25, priceCents: 2499, label: '25 Credits' },
  { id: 'pack_50', credits: 50, priceCents: 3999, label: '50 Credits' },
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
