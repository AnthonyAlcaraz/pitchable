import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ZeroEntropy, { ConflictError, NotFoundError } from 'zeroentropy';
import type { SearchResult } from '../embedding/vector-store.service.js';

@Injectable()
export class ZeroEntropyRetrievalService {
  private readonly logger = new Logger(ZeroEntropyRetrievalService.name);
  private readonly client: ZeroEntropy | null;
  private readonly knownCollections = new Set<string>();

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ZEROENTROPY_API_KEY');
    if (apiKey) {
      this.client = new ZeroEntropy({ apiKey, timeout: 30_000 });
      this.logger.log('ZeroEntropy retrieval service initialized');
    } else {
      this.client = null;
      this.logger.warn(
        'ZEROENTROPY_API_KEY not set -- ZeroEntropy retrieval disabled',
      );
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Ensure a collection exists for the given name.
   * Caches known collections to avoid redundant API calls.
   */
  async ensureCollection(collectionName: string): Promise<void> {
    if (!this.client || this.knownCollections.has(collectionName)) return;

    try {
      await this.client.collections.add({ collection_name: collectionName });
      this.knownCollections.add(collectionName);
      this.logger.log(`Created ZeroEntropy collection: ${collectionName}`);
    } catch (err: unknown) {
      if (err instanceof ConflictError) {
        this.knownCollections.add(collectionName);
        return;
      }
      throw err;
    }
  }

  /**
   * Index a document's chunks into ZeroEntropy.
   * Each chunk is uploaded as a separate document with path = documentId/chunkId.
   * Uses overwrite=true for idempotent re-indexing.
   */
  async indexDocument(
    collectionName: string,
    documentId: string,
    documentTitle: string,
    chunks: { id: string; content: string; heading?: string | null }[],
  ): Promise<void> {
    if (!this.client) return;

    await this.ensureCollection(collectionName);

    const results = await Promise.allSettled(
      chunks.map((chunk) =>
        this.client!.documents.add({
          collection_name: collectionName,
          path: `${documentId}/${chunk.id}`,
          content: { type: 'text', text: chunk.content },
          metadata: {
            document_id: documentId,
            document_title: documentTitle,
            ...(chunk.heading ? { heading: chunk.heading } : {}),
          },
          overwrite: true,
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `ZeroEntropy indexing: ${failed.length}/${chunks.length} chunks failed for document ${documentId}`,
      );
    } else {
      this.logger.log(
        `ZeroEntropy: indexed ${chunks.length} chunks for document ${documentId}`,
      );
    }
  }

  /**
   * Delete all chunks for a document from ZeroEntropy.
   */
  async deleteDocument(
    collectionName: string,
    documentId: string,
    chunkIds: string[],
  ): Promise<void> {
    if (!this.client) return;

    await Promise.allSettled(
      chunkIds.map((chunkId) =>
        this.client!.documents
          .delete({
            collection_name: collectionName,
            path: `${documentId}/${chunkId}`,
          })
          .catch((err) => {
            if (!(err instanceof NotFoundError)) throw err;
          }),
      ),
    );
    this.logger.log(
      `ZeroEntropy: deleted ${chunkIds.length} chunks for document ${documentId}`,
    );
  }

  /**
   * Search for relevant snippets using ZeroEntropy's top_snippets endpoint.
   * Returns results in the same SearchResult format as pgvector for compatibility.
   */
  async search(
    collectionName: string,
    query: string,
    limit = 10,
  ): Promise<SearchResult[]> {
    if (!this.client) return [];

    const response = await this.client.queries.topSnippets({
      collection_name: collectionName,
      query,
      k: Math.min(limit, 128),
      precise_responses: false,
      reranker: 'zerank-2',
    });

    return response.results.map((snippet) => {
      const pathParts = snippet.path.split('/');
      const documentId = pathParts[0] || '';

      const docResult = response.document_results.find(
        (d) => d.path === snippet.path,
      );
      const metadata = docResult?.metadata ?? {};

      return {
        id: (metadata['chunk_id'] as string) ?? pathParts[1] ?? snippet.path,
        content: snippet.content,
        heading: (metadata['heading'] as string) ?? null,
        headingLevel: 0,
        metadata: metadata as Record<string, unknown>,
        documentId,
        documentTitle: (metadata['document_title'] as string) ?? '',
        similarity: snippet.score,
      };
    });
  }

  collectionNameForUser(userId: string): string {
    return `kb-${userId}`;
  }
}
