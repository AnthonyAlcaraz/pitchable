/**
 * Canonical layout types for slide rendering.
 * Maps each slide's visual structure independently of export format.
 */
export enum LayoutType {
  TITLE_BODY = 'title-body',
  TWO_COLUMN = 'two-column',
  DATA_GRID = 'data-grid',
  FULL_BLEED_IMAGE = 'full-bleed-image',
  QUOTE_CENTERED = 'quote-centered',
  SECTION_DIVIDER = 'section-divider',
  PROCESS_FLOW = 'process-flow',
  COMPARISON_SPLIT = 'comparison-split',
}

/**
 * Format-agnostic slide layout specification.
 */
export interface LayoutSpec {
  layoutType: LayoutType;
  title: string;
  subtitle?: string;
  bodyBlocks: BodyBlock[];
  imageUrl?: string | null;
  imagePosition?: 'left' | 'right' | 'background' | 'inline';
  speakerNotes?: string | null;
  sectionLabel?: string | null;
  metadata?: Record<string, unknown>;
}

export type BodyBlock =
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'metrics'; items: Array<{ label: string; value: string; change?: string }> }
  | { type: 'quote'; text: string; attribution?: string };

/**
 * Map SlideType (Prisma enum string) to canonical LayoutType.
 * Covers all 17 SlideType values from the Prisma schema.
 */
export function getLayoutForSlideType(slideType: string): LayoutType {
  switch (slideType) {
    case 'TITLE':
    case 'CTA':
    case 'CONTENT':
    case 'PROBLEM':
    case 'SOLUTION':
      return LayoutType.TITLE_BODY;

    case 'ARCHITECTURE':
    case 'PROCESS':
    case 'TIMELINE':
      return LayoutType.PROCESS_FLOW;

    case 'COMPARISON':
    case 'SPLIT_STATEMENT':
      return LayoutType.COMPARISON_SPLIT;

    case 'DATA_METRICS':
    case 'METRICS_HIGHLIGHT':
    case 'MARKET_SIZING':
      return LayoutType.DATA_GRID;

    case 'QUOTE':
      return LayoutType.QUOTE_CENTERED;

    case 'VISUAL_HUMOR':
    case 'PRODUCT_SHOWCASE':
      return LayoutType.FULL_BLEED_IMAGE;

    case 'SECTION_DIVIDER':
      return LayoutType.SECTION_DIVIDER;

    case 'OUTLINE':
    case 'TEAM':
    case 'FEATURE_GRID':
    case 'LOGO_WALL':
      return LayoutType.TWO_COLUMN;

    default:
      return LayoutType.TITLE_BODY;
  }
}
