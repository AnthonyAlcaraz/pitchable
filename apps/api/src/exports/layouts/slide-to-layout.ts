import { type LayoutSpec, getLayoutForSlideType } from './layout-spec.js';

/**
 * Convert a Prisma Slide record into a format-agnostic LayoutSpec.
 */
export function slideToLayoutSpec(slide: {
  title: string;
  body: string;
  slideType: string;
  imageUrl?: string | null;
  speakerNotes?: string | null;
  sectionLabel?: string | null;
}): LayoutSpec {
  const layoutType = getLayoutForSlideType(slide.slideType);
  const bodyBlocks = parseBodyToBlocks(slide.body);

  return {
    layoutType,
    title: slide.title,
    bodyBlocks,
    imageUrl: slide.imageUrl,
    imagePosition: slide.imageUrl ? 'right' : undefined,
    speakerNotes: slide.speakerNotes,
    sectionLabel: slide.sectionLabel,
  };
}

/**
 * Parse markdown-ish slide body into typed BodyBlocks.
 */
function parseBodyToBlocks(body: string): LayoutSpec['bodyBlocks'] {
  if (!body || !body.trim()) return [];

  const blocks: LayoutSpec['bodyBlocks'] = [];
  const lines = body.split('\n');
  let currentBullets: string[] = [];
  let currentNumbered: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('\u2022 ')) {
      // Bullet list item -- flush numbered first
      if (currentNumbered.length > 0) {
        blocks.push({ type: 'numbered', items: [...currentNumbered] });
        currentNumbered = [];
      }
      currentBullets.push(trimmed.replace(/^[-*\u2022]\s+/, ''));
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered list item -- flush bullets first
      if (currentBullets.length > 0) {
        blocks.push({ type: 'bullets', items: [...currentBullets] });
        currentBullets = [];
      }
      currentNumbered.push(trimmed.replace(/^\d+\.\s+/, ''));
    } else {
      flushLists();
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }

  // Final flush
  flushLists();

  return blocks;

  function flushLists(): void {
    if (currentBullets.length > 0) {
      blocks.push({ type: 'bullets', items: [...currentBullets] });
      currentBullets = [];
    }
    if (currentNumbered.length > 0) {
      blocks.push({ type: 'numbered', items: [...currentNumbered] });
      currentNumbered = [];
    }
  }
}
