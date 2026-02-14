import { Injectable } from '@nestjs/common';

// ── Interfaces ──────────────────────────────────────────────

export type SectionType =
  | 'introduction'
  | 'problem'
  | 'solution'
  | 'data'
  | 'quote'
  | 'process'
  | 'comparison'
  | 'conclusion';

export interface ParsedSection {
  heading: string;
  body: string;
  type: SectionType;
  bulletPoints: string[];
  statistics: string[];
  quotes: string[];
}

export interface ContentMetadata {
  wordCount: number;
  sectionCount: number;
  hasStatistics: boolean;
  hasQuotes: boolean;
}

export interface ParsedContent {
  title: string;
  sections: ParsedSection[];
  metadata: ContentMetadata;
}

// ── Section Classification Keywords ─────────────────────────

const SECTION_TYPE_KEYWORDS: Record<SectionType, string[]> = {
  introduction: [
    'introduction', 'intro', 'overview', 'about', 'background',
    'welcome', 'agenda', 'outline',
  ],
  problem: [
    'problem', 'challenge', 'issue', 'pain', 'gap', 'obstacle',
    'difficulty', 'limitation', 'risk', 'threat',
  ],
  solution: [
    'solution', 'approach', 'proposal', 'strategy', 'method',
    'how we', 'our approach', 'implementation', 'product', 'platform',
  ],
  data: [
    'data', 'metrics', 'numbers', 'statistics', 'results',
    'performance', 'analytics', 'kpi', 'growth', 'revenue',
    'market', 'market size', 'tam', 'sam', 'som', 'traction',
  ],
  quote: [
    'quote', 'testimonial', 'what they say', 'feedback',
    'customer voice', 'endorsement',
  ],
  process: [
    'process', 'workflow', 'steps', 'how it works', 'pipeline',
    'roadmap', 'timeline', 'phases', 'milestones',
  ],
  comparison: [
    'comparison', 'versus', 'vs', 'compare', 'alternatives',
    'competitive', 'benchmark', 'landscape', 'pros and cons',
  ],
  conclusion: [
    'conclusion', 'summary', 'recap', 'next steps', 'takeaway',
    'action items', 'closing', 'thank', 'q&a', 'questions',
    'call to action', 'ask', 'team',
  ],
};

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ContentParserService {
  /**
   * Main entry point: parse raw text/markdown content into
   * structured sections with extracted metadata.
   */
  parseContent(rawContent: string): ParsedContent {
    const trimmed = rawContent.trim();
    if (trimmed.length === 0) {
      return {
        title: 'Untitled Presentation',
        sections: [],
        metadata: {
          wordCount: 0,
          sectionCount: 0,
          hasStatistics: false,
          hasQuotes: false,
        },
      };
    }

    // Extract title from first heading or first line
    const title = this.extractTitle(trimmed);

    // Remove the title line from the content before sectioning
    const contentWithoutTitle = this.removeTitle(trimmed);

    // Split into sections
    const rawSections = this.extractSections(contentWithoutTitle);

    // Enrich each section with classification and extracted data
    const sections: ParsedSection[] = rawSections.map((section) => {
      const type = this.classifySection(section.heading, section.body);
      const bulletPoints = this.extractBulletPoints(section.body);
      const statistics = this.extractStatistics(section.body);
      const quotes = this.extractQuotes(section.body);

      return {
        heading: section.heading,
        body: section.body,
        type,
        bulletPoints,
        statistics,
        quotes,
      };
    });

    // Aggregate metadata
    const allText = rawSections.map((s) => `${s.heading} ${s.body}`).join(' ');
    const allStats = sections.flatMap((s) => s.statistics);
    const allQuotes = sections.flatMap((s) => s.quotes);

    const metadata: ContentMetadata = {
      wordCount: this.countWords(allText),
      sectionCount: sections.length,
      hasStatistics: allStats.length > 0,
      hasQuotes: allQuotes.length > 0,
    };

    return { title, sections, metadata };
  }

  /**
   * Split text into sections by Markdown headings (##, ###) or
   * by double newlines when no headings are present.
   */
  extractSections(text: string): Array<{ heading: string; body: string }> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return [];
    }

    // Try splitting by Markdown headings (## or ###)
    const headingPattern = /^(#{2,3})\s+(.+)$/gm;
    const matches = [...trimmed.matchAll(headingPattern)];

    if (matches.length > 0) {
      return this.splitByHeadings(trimmed, matches);
    }

    // Fall back to splitting by double newlines
    return this.splitByParagraphs(trimmed);
  }

  /**
   * Classify a section based on keyword matching in its heading and body.
   * Returns the best-matching SectionType.
   */
  classifySection(heading: string, body: string): SectionType {
    const combined = `${heading} ${body}`.toLowerCase();

    let bestType: SectionType = 'introduction';
    let bestScore = 0;

    for (const [type, keywords] of Object.entries(SECTION_TYPE_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        // Heading matches are worth more than body matches
        if (heading.toLowerCase().includes(keyword)) {
          score += 3;
        } else if (combined.includes(keyword)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestType = type as SectionType;
      }
    }

    // If no keywords matched at all, default to 'introduction' for first
    // sections and 'content' (mapped to 'introduction') for others
    return bestType;
  }

  /**
   * Extract statistics: percentages, dollar amounts, large numbers.
   */
  extractStatistics(text: string): string[] {
    const patterns = [
      // Percentages: 42%, 3.5%, +12%
      /[+-]?\d+(?:\.\d+)?%/g,
      // Dollar amounts: $1.2M, $500K, $1,000, $42.5B
      /\$[\d,]+(?:\.\d+)?[KMBTkmbt]?/g,
      // Large numbers with units: 1.5M, 500K, 2B
      /\b\d+(?:\.\d+)?[KMBTkmbt]\b/g,
      // Numbers with commas (1,000+): likely statistics
      /\b\d{1,3}(?:,\d{3})+\b/g,
      // Multipliers: 10x, 3.5x
      /\b\d+(?:\.\d+)?x\b/gi,
    ];

    const found = new Set<string>();
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        found.add(match[0]);
      }
    }

    return [...found];
  }

  /**
   * Extract quoted text (text between double or single quotes,
   * or Markdown blockquotes).
   */
  extractQuotes(text: string): string[] {
    const quotes: string[] = [];

    // Double-quoted strings (min 10 chars to skip short references)
    const doubleQuotePattern = /"([^"]{10,})"/g;
    for (const match of text.matchAll(doubleQuotePattern)) {
      quotes.push(match[1]);
    }

    // Markdown blockquotes: lines starting with >
    const blockquotePattern = /^>\s*(.+)$/gm;
    for (const match of text.matchAll(blockquotePattern)) {
      const content = match[1].trim();
      if (content.length >= 10) {
        quotes.push(content);
      }
    }

    return quotes;
  }

  // ── Private Helpers ─────────────────────────────────────────

  private extractTitle(text: string): string {
    // Try to find a # heading (single #) on the first line
    const h1Match = text.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Otherwise, use the first non-empty line
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0 && !trimmedLine.startsWith('##')) {
        return trimmedLine;
      }
    }

    return 'Untitled Presentation';
  }

  private removeTitle(text: string): string {
    // Remove the first # heading if present
    const h1Match = text.match(/^#\s+.+$/m);
    if (h1Match) {
      return text.replace(h1Match[0], '').trim();
    }

    // Otherwise remove the first non-empty line
    const lines = text.split('\n');
    let foundFirst = false;
    const remaining: string[] = [];

    for (const line of lines) {
      if (!foundFirst && line.trim().length > 0) {
        foundFirst = true;
        continue;
      }
      remaining.push(line);
    }

    return remaining.join('\n').trim();
  }

  private splitByHeadings(
    text: string,
    matches: RegExpExecArray[],
  ): Array<{ heading: string; body: string }> {
    const sections: Array<{ heading: string; body: string }> = [];

    // Check for content before the first heading
    const firstMatchIndex = matches[0].index;
    if (firstMatchIndex !== undefined) {
      const preamble = text.slice(0, firstMatchIndex).trim();
      if (preamble.length > 0) {
        sections.push({
          heading: 'Overview',
          body: preamble,
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const heading = match[2].trim();
      const matchIndex = match.index ?? 0;
      const matchEnd = matchIndex + match[0].length;

      // Body extends from end of heading line to start of next heading or end of text
      const nextStart = i + 1 < matches.length
        ? (matches[i + 1].index ?? text.length)
        : text.length;

      const body = text.slice(matchEnd, nextStart).trim();

      sections.push({ heading, body });
    }

    return sections;
  }

  private splitByParagraphs(
    text: string,
  ): Array<{ heading: string; body: string }> {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return [];
    }

    // If only one paragraph, treat it as a single section
    if (paragraphs.length === 1) {
      return [{ heading: 'Content', body: paragraphs[0] }];
    }

    // Map paragraphs to sections with auto-generated headings
    return paragraphs.map((paragraph, index) => {
      // Use the first sentence or first N words as the heading
      const firstSentence = paragraph.match(/^[^.!?]+[.!?]/);
      const heading = firstSentence
        ? firstSentence[0].replace(/[.!?]$/, '').trim()
        : this.truncateWords(paragraph, 6);

      return {
        heading: heading || `Section ${index + 1}`,
        body: paragraph,
      };
    });
  }

  private extractBulletPoints(body: string): string[] {
    const bullets: string[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*[-*+]\s+(.+)/);
      if (match) {
        bullets.push(match[1].trim());
      }
    }

    return bullets;
  }

  private countWords(text: string): number {
    const stripped = text.replace(/[^\w\s]/g, ' ').trim();
    if (stripped.length === 0) return 0;
    return stripped.split(/\s+/).length;
  }

  private truncateWords(text: string, maxWords: number): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  }
}
