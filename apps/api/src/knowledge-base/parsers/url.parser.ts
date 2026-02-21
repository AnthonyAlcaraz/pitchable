import { Injectable, Logger } from '@nestjs/common';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Agent } from 'undici';
import { JinaReaderService } from './jina.service.js';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class UrlParser implements DocumentParser {
  private readonly logger = new Logger(UrlParser.name);

  constructor(private readonly jina: JinaReaderService) {}

  async parse(input: string): Promise<ParseResult> {
    const url = typeof input === 'string' ? input : String(input);

    // Try Jina Reader first (better JS rendering, markdown output, free)
    try {
      const result = await this.jina.extractPage(url);
      return {
        text: result.markdown,
        title: result.title || undefined,
        metadata: {
          sourceUrl: url,
          description: result.description || undefined,
          parser: 'jina-reader',
        },
      };
    } catch (jinaError) {
      this.logger.warn(
        `Jina Reader failed for ${url}, falling back to Readability: ${jinaError instanceof Error ? jinaError.message : String(jinaError)}`,
      );
    }

    // Fallback to Readability
    return this.readabilityFallback(url);
  }

  private async readabilityFallback(url: string): Promise<ParseResult> {
    try {
      const fetchOptions: RequestInit & { dispatcher?: Agent } = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Pitchable/1.0)',
        },
        signal: AbortSignal.timeout(30000),
      };

      // Use permissive TLS in development (self-signed certs, missing CA bundles)
      if (process.env.NODE_ENV !== 'production') {
        fetchOptions.dispatcher = new Agent({
          connect: { rejectUnauthorized: false },
        });
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent) {
        throw new Error(`Could not extract article content from ${url}`);
      }

      this.logger.log(`Readability parsed URL "${url}": title="${article.title}", ${article.textContent.length} chars`);
      return {
        text: article.textContent,
        title: article.title ?? undefined,
        metadata: {
          siteName: article.siteName ?? undefined,
          excerpt: article.excerpt ?? undefined,
          sourceUrl: url,
          parser: 'readability',
        },
      };
    } catch (error) {
      throw new Error(`URL parsing failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
