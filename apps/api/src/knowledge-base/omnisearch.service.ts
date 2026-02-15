import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Omnisearch integration for Obsidian vault content enrichment.
 *
 * Queries the local Omnisearch HTTP server (Obsidian plugin) to find
 * relevant vault documents for slide content grounding.
 *
 * Mirrors the Z4 presentation skill's vault search pipeline:
 * extract keywords → query vault → build evidence context.
 */
@Injectable()
export class OmnisearchService {
  private readonly logger = new Logger(OmnisearchService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;
  private readonly timeoutMs = 8_000;

  constructor(private configService: ConfigService) {
    const port = this.configService.get<string>('OMNISEARCH_PORT') || '27123';
    this.baseUrl = `http://localhost:${port}`;
    this.enabled = this.configService.get<string>('OMNISEARCH_ENABLED') !== 'false';

    if (this.enabled) {
      this.logger.log(`OmnisearchService configured at ${this.baseUrl}`);
    } else {
      this.logger.log('OmnisearchService disabled via OMNISEARCH_ENABLED=false');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Search the Obsidian vault for content relevant to the given query.
   * Returns formatted context string for injection into LLM prompts.
   *
   * @param query - Search query (slide title, topic, keywords)
   * @param limit - Max results to return (default 5)
   */
  async search(query: string, limit = 5): Promise<OmnisearchResult[]> {
    if (!this.enabled) return [];

    try {
      const encoded = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encoded}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          this.logger.warn(`Omnisearch returned ${response.status} for query: "${query.slice(0, 60)}"`);
          return [];
        }

        const results = (await response.json()) as OmnisearchRawResult[];

        return results.slice(0, limit).map((r) => ({
          path: r.path || '',
          basename: r.basename || '',
          content: r.content || '',
          matches: r.matches || [],
          score: r.score || 0,
        }));
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.warn(`Omnisearch timed out for query: "${query.slice(0, 60)}"`);
      } else {
        this.logger.warn(`Omnisearch unavailable: ${err instanceof Error ? err.message : 'unknown'}`);
      }
      return [];
    }
  }

  /**
   * Run multiple queries sequentially (Omnisearch is single-threaded)
   * and merge results, deduplicating by file path.
   */
  async multiSearch(queries: string[], limitPerQuery = 3): Promise<OmnisearchResult[]> {
    const seen = new Set<string>();
    const allResults: OmnisearchResult[] = [];

    for (const query of queries) {
      const results = await this.search(query, limitPerQuery);
      for (const r of results) {
        if (!seen.has(r.path)) {
          seen.add(r.path);
          allResults.push(r);
        }
      }
    }

    return allResults;
  }

  /**
   * Build a formatted context string from Omnisearch results.
   * Ready for injection into LLM system prompts.
   */
  formatAsContext(results: OmnisearchResult[]): string {
    if (results.length === 0) return '';

    const parts = ['\nVault knowledge (from Obsidian Omnisearch):'];
    for (const r of results) {
      const snippet = r.content.slice(0, 500).trim();
      parts.push(`---\n${snippet}\n(source: ${r.basename}, score: ${r.score.toFixed(2)})`);
    }
    return parts.join('\n');
  }
}

// ── Interfaces ──────────────────────────────────────────────

export interface OmnisearchResult {
  path: string;
  basename: string;
  content: string;
  matches: string[];
  score: number;
}

interface OmnisearchRawResult {
  path?: string;
  basename?: string;
  content?: string;
  matches?: string[];
  score?: number;
}
