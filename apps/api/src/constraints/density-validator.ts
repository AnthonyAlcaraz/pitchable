// ─────────────────────────────────────────────────────────────
// Content Density Validation — Design Constraint Engine
// Enforces per-slide limits on bullets, words, table rows,
// nesting depth, and concept count. Provides auto-split
// suggestions for overcrowded slides.
// ─────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────

export interface DensityLimits {
  maxBulletsPerSlide: number;
  maxTableRows: number;
  maxWordsPerSlide: number;
  maxConceptsPerSlide: number;
  maxNestedListDepth: number;
}

export interface SlideContent {
  title: string;
  body: string;
  hasTable?: boolean;
  tableRows?: number;
}

export interface DensityValidationResult {
  valid: boolean;
  violations: string[];
  suggestions: string[];
}

export interface SplitResult {
  shouldSplit: boolean;
  newSlides: Array<{ title: string; body: string }>;
}

// ── Constants ───────────────────────────────────────────────

export const MAX_WORDS_PER_BULLET = 15;

export const DENSITY_LIMITS: Readonly<DensityLimits> = {
  maxBulletsPerSlide: 4,
  maxTableRows: 4,
  maxWordsPerSlide: 60,
  maxConceptsPerSlide: 1,
  maxNestedListDepth: 1,
};

// ── Helpers ─────────────────────────────────────────────────

function countBullets(body: string): number {
  const lines = body.split('\n');
  return lines.filter((line) => /^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)).length;
}

function countWords(text: string): number {
  // Strip markdown formatting that inflates word count:
  // - **bold** and *italic* markers
  // - Table separator rows (|---|---|)
  // - Table pipe characters
  // - ### heading markers
  // - > blockquote markers
  // - Sources: citation lines (these are metadata, not content)
  const lines = text.split('\n');
  const contentLines = lines.filter((line) => {
    const trimmed = line.trim();
    // Skip table separator rows
    if (/^\|[\s-|:]+\|$/.test(trimmed)) return false;
    // Skip source citation lines
    if (/^Sources?:/i.test(trimmed)) return false;
    return true;
  });

  const joined = contentLines.join(' ');
  // Remove markdown markers
  const noMarkdown = joined
    .replace(/\*{1,2}/g, '')   // bold/italic
    .replace(/#{1,3}\s/g, '')  // headings
    .replace(/^>\s/gm, '')     // blockquotes
    .replace(/\|/g, ' ');      // table pipes
  const stripped = noMarkdown.replace(/[^\w\s]/g, ' ').trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).length;
}

function getMaxNestingDepth(body: string): number {
  const lines = body.split('\n');
  let maxDepth = 0;

  for (const line of lines) {
    if (!/^\s*[-*]\s/.test(line)) continue;
    // Count leading whitespace to determine nesting level.
    // Each 2-space or 1-tab indent = 1 level of nesting.
    const leadingSpaces = line.match(/^(\s*)/);
    if (!leadingSpaces) continue;
    const indent = leadingSpaces[1].replace(/\t/g, '  ').length;
    const depth = Math.floor(indent / 2);
    if (depth > maxDepth) maxDepth = depth;
  }

  return maxDepth;
}

/**
 * Split an array of bullet lines into chunks of `chunkSize`.
 */
function chunkBullets(bullets: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < bullets.length; i += chunkSize) {
    chunks.push(bullets.slice(i, i + chunkSize));
  }
  return chunks;
}

// ── Validators ──────────────────────────────────────────────

/**
 * Validate slide content against density limits.
 * Returns actionable violations and suggestions for each one.
 */
export function validateSlideContent(slide: SlideContent, limits: DensityLimits = DENSITY_LIMITS): DensityValidationResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  // Bullet count
  const bulletCount = countBullets(slide.body);
  if (bulletCount > limits.maxBulletsPerSlide) {
    violations.push(
      `Slide has ${bulletCount} bullets (max ${limits.maxBulletsPerSlide}).`,
    );
    suggestions.push(
      `Split into ${Math.ceil(bulletCount / limits.maxBulletsPerSlide)} slides with ${limits.maxBulletsPerSlide} bullets each, or consolidate related points.`,
    );
  }

  // Words per bullet (includes numbered steps)
  const lines = slide.body.split('\n');
  const bulletLines = lines.filter((line) => /^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line));
  for (const bullet of bulletLines) {
    const text = bullet.replace(/^\s*[-*]\s/, '').replace(/^\s*\d+[.)]\s/, '');
    const wordCount = countWords(text);
    if (wordCount > MAX_WORDS_PER_BULLET) {
      violations.push(
        `Bullet has ${wordCount} words (max ${MAX_WORDS_PER_BULLET}): "${text.substring(0, 40)}..."`,
      );
      suggestions.push('Shorten bullet to a concise phrase.');
    }
  }

  // Word count
  const totalWords = countWords(slide.title) + countWords(slide.body);
  if (totalWords > limits.maxWordsPerSlide) {
    violations.push(
      `Slide has ${totalWords} words (max ${limits.maxWordsPerSlide}).`,
    );
    suggestions.push(
      `Reduce text to key phrases. Move detailed content to speaker notes or a handout.`,
    );
  }

  // Table rows — auto-detect from body if not explicitly provided
  const detectedTableRows = slide.body.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && !/^\|[\s-|:]+\|$/.test(trimmed);
  }).length;
  const tableRowCount = slide.tableRows ?? (detectedTableRows > 0 ? detectedTableRows - 1 : 0); // subtract header
  const hasTable = slide.hasTable ?? detectedTableRows > 0;

  if (hasTable && tableRowCount > limits.maxTableRows) {
    violations.push(
      `Table has ${tableRowCount} rows (max ${limits.maxTableRows}).`,
    );
    suggestions.push(
      `Split the table across multiple slides, or show only the top ${limits.maxTableRows} rows with a "full data in appendix" note.`,
    );
  }

  // Nesting depth
  const nestingDepth = getMaxNestingDepth(slide.body);
  if (nestingDepth > limits.maxNestedListDepth) {
    violations.push(
      `List nesting depth is ${nestingDepth} (max ${limits.maxNestedListDepth}).`,
    );
    suggestions.push(
      `Flatten nested lists. Promote sub-items to their own top-level bullets or move them to a separate slide.`,
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    suggestions,
  };
}

/**
 * Auto-split an overcrowded slide into multiple slides.
 * Splits by bullet points when over the limit, distributing
 * evenly across new slides.
 */
export function suggestSplit(slide: SlideContent, limits: DensityLimits = DENSITY_LIMITS): SplitResult {
  const bulletLines: string[] = [];
  const nonBulletLines: string[] = [];

  for (const line of slide.body.split('\n')) {
    if (/^\s*[-*]\s/.test(line)) {
      bulletLines.push(line);
    } else if (line.trim().length > 0) {
      nonBulletLines.push(line);
    }
  }

  const totalWords = countWords(slide.title) + countWords(slide.body);
  const tooManyBullets = bulletLines.length > limits.maxBulletsPerSlide;
  const tooManyWords = totalWords > limits.maxWordsPerSlide;

  if (!tooManyBullets && !tooManyWords) {
    return {
      shouldSplit: false,
      newSlides: [{ title: slide.title, body: slide.body }],
    };
  }

  // If we have bullets to split on, chunk them
  if (bulletLines.length > 0) {
    const chunks = chunkBullets(bulletLines, limits.maxBulletsPerSlide);
    const preamble = nonBulletLines.length > 0
      ? nonBulletLines.join('\n') + '\n'
      : '';

    const newSlides = chunks.map((chunk, index) => {
      const suffix = chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : '';
      return {
        title: `${slide.title}${suffix}`,
        body: (index === 0 ? preamble : '') + chunk.join('\n'),
      };
    });

    return { shouldSplit: true, newSlides };
  }

  // No bullets — split body text by sentences into roughly equal halves
  const sentences = slide.body.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 1) {
    return {
      shouldSplit: false,
      newSlides: [{ title: slide.title, body: slide.body }],
    };
  }

  const mid = Math.ceil(sentences.length / 2);
  return {
    shouldSplit: true,
    newSlides: [
      { title: `${slide.title} (1/2)`, body: sentences.slice(0, mid).join(' ') },
      { title: `${slide.title} (2/2)`, body: sentences.slice(mid).join(' ') },
    ],
  };
}
