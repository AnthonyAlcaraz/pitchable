import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface SearchResult {
  id: string;
  content: string;
  heading: string | null;
  headingLevel: number;
  metadata: Record<string, unknown>;
  documentId: string;
  documentTitle: string;
  similarity: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateChunkEmbeddings(
    _documentId: string,
    _chunkEmbeddings: { chunkId: string; embedding: number[] }[],
  ): Promise<void> {
    this.logger.warn('pgvector not available — skipping embedding storage');
  }

  async searchSimilar(
    userId: string,
    _queryEmbedding: number[],
    limit = 10,
    _threshold = 0.3,
    query = '',
  ): Promise<SearchResult[]> {
    this.logger.warn('pgvector not available — falling back to keyword search');
    return this.searchByKeywords(userId, query, limit);
  }

  /**
   * Keyword-based search fallback when embeddings are unavailable.
   * Uses PostgreSQL ILIKE for simple term matching across chunk content.
   */
  async searchByKeywords(
    userId: string,
    query: string,
    limit = 10,
  ): Promise<SearchResult[]> {
    // Extract meaningful words (4+ chars) as search terms
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 8);

    if (terms.length === 0) return [];

    // Build a WHERE clause that scores by number of matching terms
    const likeConditions = terms
      .map((_, i) => `CASE WHEN LOWER(dc."content") LIKE '%' || $${i + 3} || '%' THEN 1 ELSE 0 END`)
      .join(' + ');

    const query_str = `
      SELECT
        dc."id",
        dc."content",
        dc."heading",
        dc."headingLevel",
        dc."metadata",
        dc."documentId",
        d."title" as "documentTitle",
        (${likeConditions})::float / ${terms.length}::float as "similarity"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      WHERE d."userId" = $1::uuid
        AND d."status" = 'READY'
        AND (${likeConditions}) > 0
      ORDER BY (${likeConditions}) DESC
      LIMIT $2
    `;

    const params: (string | number)[] = [userId, limit, ...terms];

    const results = await this.prisma.$queryRawUnsafe<SearchResult[]>(
      query_str,
      ...params,
    );

    return results;
  }

  async deleteDocumentEmbeddings(_documentId: string): Promise<void> {
    // No-op: pgvector embedding column removed (using ZeroEntropy for retrieval)
  }
}
