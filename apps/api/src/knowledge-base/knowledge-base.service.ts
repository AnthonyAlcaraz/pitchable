import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './storage/s3.service.js';
import { EmbeddingService } from './embedding/embedding.service.js';
import { VectorStoreService } from './embedding/vector-store.service.js';
import type { SearchResult } from './embedding/vector-store.service.js';
import { FalkorDbService } from './falkordb/falkordb.service.js';
import { ZeroEntropyRetrievalService } from './zeroentropy/zeroentropy-retrieval.service.js';
import { DocumentSourceType, DocumentStatus } from '../../generated/prisma/enums.js';
import { randomUUID } from 'node:crypto';

export interface DocumentProcessingJobData {
  documentId: string;
  userId: string;
  sourceType: 'FILE' | 'TEXT' | 'URL';
  mimeType?: string;
  s3Key?: string;
  rawText?: string;
  url?: string;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    @InjectQueue('document-processing') private readonly docQueue: Queue,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly falkordb: FalkorDbService,
    private readonly zeRetrieval: ZeroEntropyRetrievalService,
  ) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    customTitle?: string,
  ) {
    if (!this.s3.isAvailable()) {
      throw new Error('File storage is not configured. Contact support or set up S3/R2.');
    }

    const s3Key = `documents/${userId}/${randomUUID()}/${file.originalname}`;
    await this.s3.upload(s3Key, file.buffer, file.mimetype);

    const title = customTitle || file.originalname;
    const document = await this.prisma.document.create({
      data: {
        userId,
        title,
        sourceType: DocumentSourceType.FILE,
        mimeType: file.mimetype,
        fileSize: file.size,
        s3Key,
        status: DocumentStatus.UPLOADED,
      },
    });

    await this.docQueue.add('process-document', {
      documentId: document.id,
      userId,
      sourceType: 'FILE',
      mimeType: file.mimetype,
      s3Key,
    } satisfies DocumentProcessingJobData);

    this.logger.log(`Document ${document.id} uploaded and queued for processing`);
    return document;
  }

  async createTextSource(userId: string, content: string, customTitle?: string) {
    const title = customTitle || `Text source - ${new Date().toISOString().slice(0, 10)}`;
    const document = await this.prisma.document.create({
      data: {
        userId,
        title,
        sourceType: DocumentSourceType.TEXT,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        status: DocumentStatus.UPLOADED,
      },
    });

    await this.docQueue.add('process-document', {
      documentId: document.id,
      userId,
      sourceType: 'TEXT',
      rawText: content,
    } satisfies DocumentProcessingJobData);

    this.logger.log(`Text source ${document.id} created and queued`);
    return document;
  }

  async createUrlSource(userId: string, url: string, customTitle?: string) {
    const title = customTitle || url;
    const document = await this.prisma.document.create({
      data: {
        userId,
        title,
        sourceType: DocumentSourceType.URL,
        sourceUrl: url,
        status: DocumentStatus.UPLOADED,
      },
    });

    await this.docQueue.add('process-document', {
      documentId: document.id,
      userId,
      sourceType: 'URL',
      url,
    } satisfies DocumentProcessingJobData);

    this.logger.log(`URL source ${document.id} created and queued`);
    return document;
  }

  async listDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        sourceType: true,
        mimeType: true,
        fileSize: true,
        status: true,
        chunkCount: true,
        errorMessage: true,
        sourceUrl: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getDocument(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async deleteDocument(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.s3Key) {
      try {
        await this.s3.delete(doc.s3Key);
      } catch (error) {
        this.logger.warn(`Failed to delete S3 object ${doc.s3Key}: ${error}`);
      }
    }

    // Delete from ZeroEntropy if enabled (non-blocking)
    if (this.zeRetrieval.isAvailable()) {
      try {
        const chunks = await this.prisma.documentChunk.findMany({
          where: { documentId },
          select: { id: true },
        });
        const collectionName = this.zeRetrieval.collectionNameForUser(userId);
        await this.zeRetrieval.deleteDocument(
          collectionName,
          documentId,
          chunks.map((c) => c.id),
        );
      } catch (zeError) {
        this.logger.warn(`ZeroEntropy delete failed (non-blocking): ${zeError}`);
      }
    }

    // Delete from FalkorDB if enabled (non-blocking)
    if (this.falkordb.isEnabled()) {
      try {
        const graphName = FalkorDbService.kbGraphName(userId);
        await this.falkordb.deleteDocument(graphName, documentId);
      } catch (fkError) {
        this.logger.warn(`FalkorDB delete failed (non-blocking): ${fkError}`);
      }
    }

    // Cascade deletes DocumentChunks via Prisma relation
    await this.prisma.document.delete({ where: { id: documentId } });
    return { message: 'Document deleted' };
  }

  async search(
    userId: string,
    query: string,
    limit = 10,
    threshold = 0.3,
  ): Promise<SearchResult[]> {
    // 1. Try ZeroEntropy first (managed retrieval with built-in reranking)
    if (this.zeRetrieval.isAvailable()) {
      try {
        const collectionName = this.zeRetrieval.collectionNameForUser(userId);
        const results = await this.zeRetrieval.search(collectionName, query, limit);
        if (results.length > 0) return results;
      } catch (zeError) {
        this.logger.warn(
          `ZeroEntropy search failed, falling back: ${zeError instanceof Error ? zeError.message : String(zeError)}`,
        );
      }
    }

    // 2. Fallback: pgvector search (if embeddings available)
    if (this.embeddingService.isAvailable()) {
      const queryEmbedding = await this.embeddingService.embed(query);
      return this.vectorStore.searchSimilar(userId, queryEmbedding, limit, threshold, query);
    }

    // 3. Final fallback: keyword-based search (no API key needed)
    this.logger.log('Using keyword-based KB search (no OPENAI_API_KEY)');
    return this.vectorStore.searchByKeywords(userId, query, limit);
  }

  /**
   * Re-index all READY documents for a user into ZeroEntropy.
   * Used when ZeroEntropy was enabled after documents were already processed.
   */
  async reindexZeroEntropy(userId: string): Promise<{ indexed: number; failed: number }> {
    if (!this.zeRetrieval.isAvailable()) {
      throw new Error('ZeroEntropy is not available');
    }

    const documents = await this.prisma.document.findMany({
      where: { userId, status: DocumentStatus.READY },
      include: {
        chunks: {
          select: { id: true, content: true, heading: true },
        },
      },
    });

    let indexed = 0;
    let failed = 0;
    const collectionName = this.zeRetrieval.collectionNameForUser(userId);

    for (const doc of documents) {
      if (doc.chunks.length === 0) continue;
      try {
        await this.zeRetrieval.indexDocument(
          collectionName,
          doc.id,
          doc.title,
          doc.chunks,
        );
        indexed++;
        this.logger.log(`Re-indexed document ${doc.id} (${doc.chunks.length} chunks) into ZeroEntropy`);
      } catch (err) {
        failed++;
        this.logger.warn(
          `Failed to re-index document ${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { indexed, failed };
  }
}
