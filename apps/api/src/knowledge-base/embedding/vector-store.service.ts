import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as pgvector from 'pgvector';

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
    documentId: string,
    chunkEmbeddings: { chunkId: string; embedding: number[] }[],
  ): Promise<void> {
    for (const { chunkId, embedding } of chunkEmbeddings) {
      const vectorSql = pgvector.toSql(embedding);
      await this.prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET "embedding" = ${vectorSql}::vector
        WHERE "id" = ${chunkId}::uuid
          AND "documentId" = ${documentId}::uuid
      `;
    }
    this.logger.log(
      `Updated ${chunkEmbeddings.length} embeddings for document ${documentId}`,
    );
  }

  async searchSimilar(
    userId: string,
    queryEmbedding: number[],
    limit = 10,
    threshold = 0.3,
  ): Promise<SearchResult[]> {
    const vectorSql = pgvector.toSql(queryEmbedding);

    const results = await this.prisma.$queryRaw<SearchResult[]>`
      SELECT
        dc."id",
        dc."content",
        dc."heading",
        dc."headingLevel",
        dc."metadata",
        dc."documentId",
        d."title" as "documentTitle",
        (1 - (dc."embedding" <=> ${vectorSql}::vector)) as "similarity"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      WHERE d."userId" = ${userId}::uuid
        AND d."status" = 'READY'
        AND dc."embedding" IS NOT NULL
        AND (1 - (dc."embedding" <=> ${vectorSql}::vector)) > ${threshold}
      ORDER BY dc."embedding" <=> ${vectorSql}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET "embedding" = NULL
      WHERE "documentId" = ${documentId}::uuid
    `;
  }
}
