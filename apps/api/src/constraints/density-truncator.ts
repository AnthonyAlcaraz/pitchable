/**
 * Programmatic density enforcement — truncates slide content
 * to fit within density limits AFTER LLM generation.
 * Replaces most SONNET content reviewer calls when validation passes.
 */

export interface TruncationLimits {
  maxBullets: number;
  maxWords: number;
  maxTableRows: number;
}

const DEFAULT_LIMITS: TruncationLimits = {
  maxBullets: 4,
  maxWords: 50,
  maxTableRows: 4,
};

/**
 * Truncate slide body to fit within density limits.
 * Returns { body, overflow } where overflow goes to speakerNotes.
 */
export function truncateToLimits(
  body: string,
  limits: Partial<TruncationLimits> = {},
): { body: string; overflow: string; wasTruncated: boolean } {
  const l = { ...DEFAULT_LIMITS, ...limits };
  const lines = body.split('\n');
  const resultLines: string[] = [];
  const overflowLines: string[] = [];
  let bulletCount = 0;
  let tableRowCount = 0;
  let inTable = false;
  let wasTruncated = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Table separator row — always keep
      if (/^\|[\s-|:]+\|$/.test(trimmed)) {
        resultLines.push(line);
        inTable = true;
        continue;
      }

      if (!inTable) {
        // Header row
        inTable = true;
        resultLines.push(line);
        continue;
      }

      // Data row
      tableRowCount++;
      if (tableRowCount <= l.maxTableRows) {
        resultLines.push(line);
      } else {
        overflowLines.push(line);
        wasTruncated = true;
      }
      continue;
    }

    // Reset table tracking when we leave table
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false;
    }

    // Bullet detection
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      bulletCount++;
      if (bulletCount <= l.maxBullets) {
        resultLines.push(line);
      } else {
        overflowLines.push(line);
        wasTruncated = true;
      }
      continue;
    }

    // Non-bullet, non-table lines always pass through
    resultLines.push(line);
  }

  // Word count check on result — truncate trailing content if over limit
  const resultBody = resultLines.join('\n');
  const wordCount = countContentWords(resultBody);
  if (wordCount > l.maxWords) {
    wasTruncated = true;
    // Don't truncate mid-sentence — just flag overflow for speaker notes
  }

  return {
    body: resultBody,
    overflow: overflowLines.length > 0
      ? 'Additional details: ' + overflowLines.map(ln => ln.replace(/^\s*[-*]\s/, '').replace(/^\s*\d+[.)]\s/, '').trim()).join('; ')
      : '',
    wasTruncated,
  };
}

/**
 * Check if slide content passes density limits without needing
 * the LLM content reviewer. Returns true if all limits pass.
 */
export function passesDensityCheck(
  body: string,
  limits: Partial<TruncationLimits> = {},
): boolean {
  const l = { ...DEFAULT_LIMITS, ...limits };
  const lines = body.split('\n');
  let bulletCount = 0;
  let tableRowCount = 0;
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|[\s-|:]+\|$/.test(trimmed)) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        inTable = true;
        continue; // header
      }
      tableRowCount++;
      if (tableRowCount > l.maxTableRows) return false;
      continue;
    }

    if (inTable && !trimmed.startsWith('|')) inTable = false;

    if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      bulletCount++;
      if (bulletCount > l.maxBullets) return false;
    }
  }

  const wordCount = countContentWords(body);
  if (wordCount > l.maxWords) return false;

  return true;
}

/** Count words in slide content, stripping markdown formatting. */
function countContentWords(text: string): number {
  const lines = text.split('\n');
  const contentLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (/^\|[\s-|:]+\|$/.test(trimmed)) return false;
    if (/^Sources?:/i.test(trimmed)) return false;
    return true;
  });
  const joined = contentLines.join(' ');
  const noMarkdown = joined
    .replace(/\*{1,2}/g, '')
    .replace(/#{1,3}\s/g, '')
    .replace(/^>\s/gm, '')
    .replace(/\|/g, ' ');
  const stripped = noMarkdown.replace(/[^\w\s]/g, ' ').trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).length;
}
