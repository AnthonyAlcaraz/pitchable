import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './storage/s3.service.js';
import { EmbeddingService } from './embedding/embedding.service.js';
import { VectorStoreService } from './embedding/vector-store.service.js';
import type { SearchResult } from './embedding/vector-store.service.js';
import { EdgeQuakeService } from './edgequake/edgequake.service.js';
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
    private readonly edgequake: EdgeQuakeService,
  ) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    customTitle?: string,
  ) {
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

    // Delete from EdgeQuake if enabled (non-blocking)
    if (this.edgequake.isEnabled()) {
      try {
        const mapping = await this.prisma.edgeQuakeMapping.findUnique({
          where: { userId },
        });
        if (mapping) {
          await this.edgequake.deleteDocument(
            mapping.tenantId,
            mapping.workspaceId,
            documentId,
          );
        }
      } catch (eqError) {
        this.logger.warn(`EdgeQuake delete failed (non-blocking): ${eqError}`);
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
    // Try EdgeQuake Graph-RAG first if enabled
    if (this.edgequake.isEnabled()) {
      try {
        const mapping = await this.prisma.edgeQuakeMapping.findUnique({
          where: { userId },
        });
        if (mapping) {
          const result = await this.edgequake.query(
            mapping.tenantId,
            mapping.workspaceId,
            query,
            'hybrid',
          );
          return result.sources.slice(0, limit).map((s) => ({
            id: s.chunk_id,
            content: s.content,
            heading: null,
            headingLevel: 0,
            metadata: s.metadata ?? {},
            documentId: s.document_id,
            documentTitle: '',
            similarity: s.score,
          }));
        }
      } catch (eqError) {
        this.logger.warn(
          `EdgeQuake search failed, falling back to pgvector: ${eqError instanceof Error ? eqError.message : String(eqError)}`,
        );
      }
    }

    // Fallback: pgvector search (if embeddings available) or keyword search
    if (this.embeddingService.isAvailable()) {
      const queryEmbedding = await this.embeddingService.embed(query);
      return this.vectorStore.searchSimilar(userId, queryEmbedding, limit, threshold);
    }

    // Final fallback: keyword-based search (no API key needed)
    this.logger.log('Using keyword-based KB search (no OPENAI_API_KEY)');
    return this.vectorStore.searchByKeywords(userId, query, limit);
  }
}
