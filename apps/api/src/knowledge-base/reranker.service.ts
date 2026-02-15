import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import type { SearchResult } from './embedding/vector-store.service.js';

/**
 * ZeroEntropy reranker service.
 * Uses zerank-2 model to semantically rerank KB search results.
 * Falls back to original ordering if API is unavailable.
 *
 * API: https://api.zeroentropy.dev/v1/models/rerank
 * Cost: ~$0.025 per 1M tokens
 */
@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);
  private readonly apiKey: string | null;
  private readonly endpoint = 'https://api.zeroentropy.dev/v1/models/rerank';
  private readonly model = 'zerank-2';
  private readonly timeout = 15000; // 15s for reranking

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ZEROENTROPY_API_KEY') ?? null;
    if (this.apiKey) {
      this.logger.log('ZeroEntropy reranker enabled (zerank-2)');
    } else {
      this.logger.warn(
        'ZEROENTROPY_API_KEY not set — reranking disabled, using original result order',
      );
    }
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  /**
   * Rerank search results using ZeroEntropy's semantic reranker.
   * Returns results sorted by semantic relevance to the query.
   * Falls back to original order on any failure.
   */
  async rerank(
    query: string,
    results: SearchResult[],
    topK = 10,
    minScore = 0.1,
  ): Promise<SearchResult[]> {
    if (!this.apiKey || results.length <= 1) {
      return results;
    }

    try {
      const documents = results.map((r) => r.content);

      const body = JSON.stringify({
        model: this.model,
        query,
        documents,
        top_n: Math.min(topK, results.length),
      });

      const response = await this.callApi(body);

      if (!response.results || !Array.isArray(response.results)) {
        this.logger.warn('Unexpected reranker response format');
        return results;
      }

      // Map reranked indices back to original SearchResult objects
      const reranked: SearchResult[] = response.results
        .filter(
          (r: { index: number; relevance_score?: number; score?: number }) =>
            (r.relevance_score ?? r.score ?? 0) >= minScore,
        )
        .map(
          (r: { index: number; relevance_score?: number; score?: number }) => ({
            ...results[r.index],
            similarity: r.relevance_score ?? r.score ?? results[r.index].similarity,
          }),
        );

      this.logger.debug(
        `Reranked ${results.length} → ${reranked.length} results for query "${query.slice(0, 60)}..."`,
      );

      return reranked;
    } catch (err) {
      this.logger.warn(
        `Reranker failed, using original order: ${err instanceof Error ? err.message : String(err)}`,
      );
      return results;
    }
  }

  private callApi(body: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.endpoint);

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: this.timeout,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`API ${res.statusCode}: ${data.slice(0, 200)}`));
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          });
        },
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Reranker request timeout'));
      });
      req.write(body);
      req.end();
    });
  }
}
