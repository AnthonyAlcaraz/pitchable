import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CrawlPageResult {
  url: string;
  markdown: string;
  title: string;
}

export interface CrawlResult {
  pages: CrawlPageResult[];
  totalPages: number;
}

@Injectable()
export class FirecrawlService {
  private readonly logger = new Logger(FirecrawlService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.firecrawl.dev/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FIRECRAWL_API_KEY');
    if (this.apiKey) {
      this.logger.log('Firecrawl API key configured — website crawling enabled');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async crawlWebsite(
    url: string,
    opts: { maxPages?: number; maxDepth?: number } = {},
  ): Promise<CrawlResult> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const maxPages = opts.maxPages ?? 20;
    const maxDepth = opts.maxDepth ?? 2;

    // Start crawl job
    const startResponse = await fetch(`${this.baseUrl}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: maxPages,
        maxDepth,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!startResponse.ok) {
      const text = await startResponse.text();
      throw new Error(`Firecrawl crawl start failed (${startResponse.status}): ${text}`);
    }

    const startData = (await startResponse.json()) as { success: boolean; id: string };
    if (!startData.success || !startData.id) {
      throw new Error('Firecrawl crawl start returned unexpected response');
    }

    const jobId = startData.id;
    this.logger.log(`Firecrawl crawl started: jobId=${jobId}, url=${url}, maxPages=${maxPages}`);

    // Poll for completion (max 5 minutes)
    const maxWaitMs = 5 * 60 * 1000;
    const pollIntervalMs = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      const statusResponse = await fetch(`${this.baseUrl}/crawl/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!statusResponse.ok) {
        this.logger.warn(`Firecrawl poll failed (${statusResponse.status}), retrying...`);
        continue;
      }

      const statusData = (await statusResponse.json()) as {
        status: string;
        data?: Array<{
          markdown?: string;
          metadata?: { title?: string; sourceURL?: string };
        }>;
        total?: number;
      };

      if (statusData.status === 'completed') {
        const pages: CrawlPageResult[] = (statusData.data || [])
          .filter((d) => d.markdown)
          .map((d) => ({
            url: d.metadata?.sourceURL || url,
            markdown: d.markdown!,
            title: d.metadata?.title || d.metadata?.sourceURL || 'Untitled',
          }));

        this.logger.log(`Firecrawl crawl complete: ${pages.length} pages from ${url}`);
        return { pages, totalPages: pages.length };
      }

      if (statusData.status === 'failed') {
        throw new Error('Firecrawl crawl job failed');
      }

      // Still scraping — continue polling
    }

    throw new Error(`Firecrawl crawl timed out after ${maxWaitMs / 1000}s`);
  }

  async extractPage(url: string): Promise<CrawlPageResult> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firecrawl scrape failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        markdown?: string;
        metadata?: { title?: string; sourceURL?: string };
      };
    };

    if (!data.success || !data.data?.markdown) {
      throw new Error('Firecrawl scrape returned empty content');
    }

    return {
      url: data.data.metadata?.sourceURL || url,
      markdown: data.data.markdown,
      title: data.data.metadata?.title || 'Untitled',
    };
  }
}
