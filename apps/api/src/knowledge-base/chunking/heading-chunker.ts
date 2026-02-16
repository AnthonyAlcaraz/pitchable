import type { DocumentChunkData } from './chunk.interface.js';

export interface ChunkOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  maxChunkSize: 2000,
  minChunkSize: 200,
  overlapSize: 200,
};

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

interface Section {
  heading: string | null;
  headingLevel: number;
  body: string;
}

export function chunkByHeadings(
  text: string,
  options: ChunkOptions = {},
): DocumentChunkData[] {
  const opts = { ...DEFAULTS, ...options };
  const lines = text.split('\n');

  // 1. Split into sections by headings
  const sections: Section[] = [];
  let currentSection: Section = { heading: null, headingLevel: 0, body: '' };

  for (const line of lines) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      if (currentSection.body.trim().length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: match[2].trim(),
        headingLevel: match[1].length,
        body: '',
      };
    } else {
      currentSection.body += line + '\n';
    }
  }
  if (currentSection.body.trim().length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  // 2. If no sections found, create one from entire text
  if (sections.length === 0) {
    sections.push({ heading: null, headingLevel: 0, body: text });
  }

  // 3. Merge small sections without headings into previous
  const merged: Section[] = [];
  for (const section of sections) {
    const contentLength = (section.heading || '').length + section.body.trim().length;
    if (
      merged.length > 0 &&
      contentLength < opts.minChunkSize &&
      !section.heading
    ) {
      merged[merged.length - 1].body += '\n' + section.body;
    } else {
      merged.push({ ...section });
    }
  }

  // 4. Split oversized sections and build chunks
  const chunks: DocumentChunkData[] = [];
  const headingStack: string[] = [];
  let chunkIndex = 0;

  for (const section of merged) {
    if (section.heading) {
      while (headingStack.length >= section.headingLevel) {
        headingStack.pop();
      }
      headingStack.push(section.heading);
    }

    const sectionPath = [...headingStack];
    const headingPrefix = section.heading ? `${section.heading}\n\n` : '';
    const bodyText = section.body.trim();
    const fullContent = headingPrefix + bodyText;

    if (fullContent.length <= opts.maxChunkSize) {
      if (fullContent.trim().length >= opts.minChunkSize || chunks.length === 0) {
        chunks.push({
          content: addOverlap(chunks, fullContent.trim(), opts.overlapSize),
          heading: section.heading,
          headingLevel: section.headingLevel,
          chunkIndex: chunkIndex++,
          metadata: { sectionPath },
        });
      } else if (chunks.length > 0) {
        chunks[chunks.length - 1].content += '\n\n' + fullContent.trim();
      }
    } else {
      // Split oversized section into chunks, preserving paragraph boundaries
      const paragraphs = splitIntoParagraphs(bodyText, opts.maxChunkSize);
      let buffer = headingPrefix;

      for (const paragraph of paragraphs) {
        if (buffer.length + paragraph.length > opts.maxChunkSize && buffer.trim().length > 0) {
          chunks.push({
            content: addOverlap(chunks, buffer.trim(), opts.overlapSize),
            heading: section.heading,
            headingLevel: section.headingLevel,
            chunkIndex: chunkIndex++,
            metadata: { sectionPath },
          });
          buffer = headingPrefix + paragraph + '\n\n';
        } else {
          buffer += paragraph + '\n\n';
        }
      }

      if (buffer.trim().length > 0) {
        chunks.push({
          content: addOverlap(chunks, buffer.trim(), opts.overlapSize),
          heading: section.heading,
          headingLevel: section.headingLevel,
          chunkIndex: chunkIndex++,
          metadata: { sectionPath },
        });
      }
    }
  }

  return chunks;
}

/**
 * Split text into paragraph units. First tries double-newline splits.
 * If that produces a single block larger than maxSize, falls back to
 * grouping single-newline-separated lines into paragraph-sized units.
 */
function splitIntoParagraphs(text: string, maxSize: number): string[] {
  const doubleSplit = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // If double-newline split produced multiple paragraphs, use those
  if (doubleSplit.length > 1) return doubleSplit;

  // Single block — try splitting on single newlines and grouping
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return doubleSplit;

  const groups: string[] = [];
  let buffer = '';

  for (const line of lines) {
    if (buffer.length + line.length + 1 > maxSize && buffer.length > 0) {
      groups.push(buffer.trim());
      buffer = line;
    } else {
      buffer += (buffer ? '\n' : '') + line;
    }
  }

  if (buffer.trim().length > 0) {
    groups.push(buffer.trim());
  }

  return groups.length > 0 ? groups : doubleSplit;
}

function addOverlap(
  existingChunks: DocumentChunkData[],
  content: string,
  overlapSize: number,
): string {
  if (existingChunks.length === 0 || overlapSize <= 0) return content;
  const prevContent = existingChunks[existingChunks.length - 1].content;
  const overlap = prevContent.slice(-overlapSize);
  if (content.startsWith(overlap)) return content;
  return overlap + '\n\n' + content;
}
