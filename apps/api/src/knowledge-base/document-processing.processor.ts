import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './storage/s3.service.js';
import { PdfParser } from './parsers/pdf.parser.js';
import { DocxParser } from './parsers/docx.parser.js';
import { MarkdownParser } from './parsers/markdown.parser.js';
import { TextParser } from './parsers/text.parser.js';
import { UrlParser } from './parsers/url.parser.js';
import { SpreadsheetParser } from './parsers/spreadsheet.parser.js';
import { PptxParser } from './parsers/pptx.parser.js';
import { EmbeddingService } from './embedding/embedding.service.js';
import { VectorStoreService } from './embedding/vector-store.service.js';
import { FalkorDbService } from './falkordb/falkordb.service.js';
import { EntityExtractorService } from './falkordb/entity-extractor.service.js';
import { ZeroEntropyRetrievalService } from './zeroentropy/zeroentropy-retrieval.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { LlmService, LlmModel } from '../chat/llm.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import type { DocumentProgressEvent } from '../events/events.gateway.js';
import { chunkByHeadings } from './chunking/heading-chunker.js';
import { contentHash } from './utils/content-hash.js';
import { BriefStatus, CreditReason, DocumentStatus } from '../../generated/prisma/enums.js';
import { ENTITY_EXTRACTION_COST } from '../credits/tier-config.js';
import type { DocumentProcessingJobData } from './knowledge-base.service.js';
import type { ParseResult } from './parsers/parser.interface.js';

@Processor('document-processing')
export class DocumentProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly pdfParser: PdfParser,
    private readonly docxParser: DocxParser,
    private readonly markdownParser: MarkdownParser,
    private readonly textParser: TextParser,
    private readonly urlParser: UrlParser,
    private readonly spreadsheetParser: SpreadsheetParser,
    private readonly pptxParser: PptxParser,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly falkordb: FalkorDbService,
    private readonly entityExtractor: EntityExtractorService,
    private readonly zeRetrieval: ZeroEntropyRetrievalService,
    private readonly events: EventsGateway,
    private readonly credits: CreditsService,
    private readonly llm: LlmService,
  ) {
    super();
  }

  private emitProgress(userId: string, documentId: string, step: string, progress: number, message: string): void {
    this.events.emitDocumentProgress(userId, { documentId, step, progress, message });
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { documentId, userId, sourceType, mimeType, s3Key, rawText, url, fileBase64 } = job.data;
    this.logger.log(`Processing document ${documentId} (type: ${sourceType})`);

    try {
      // 1. Update status to PARSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PARSING },
      });

      this.emitProgress(userId, documentId, 'parsing', 10, 'Parsing document...');

      // 2. Extract text based on source type
      let extractedText: string;

      if (sourceType === 'TEXT') {
        const result = await this.textParser.parse(rawText!);
        extractedText = result.text;
      } else if (sourceType === 'URL') {
        const result = await this.urlParser.parse(url!);
        extractedText = result.text;
        if (result.title) {
          await this.prisma.document.update({
            where: { id: documentId },
            data: { title: result.title },
          });
        }
      } else {
        // FILE type -- download from S3 or use inline buffer
        let buffer: Buffer;
        if (s3Key) {
          buffer = await this.s3.getBuffer(s3Key);
        } else if (fileBase64) {
          buffer = Buffer.from(fileBase64, 'base64');
        } else {
          throw new Error('No S3 key or inline buffer available for file processing');
        }
        const result = await this.parseByMimeType(buffer, mimeType!);
        extractedText = result.text;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      // 2b. Compute and store document-level content hash
      const docHash = contentHash(extractedText);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { contentHash: docHash },
      });

      this.emitProgress(userId, documentId, 'hashing', 20, 'Computing content hash...');

      // Warn if an identical document already exists for this user
      const duplicateDoc = await this.prisma.document.findFirst({
        where: {
          userId,
          contentHash: docHash,
          id: { not: documentId },
          status: DocumentStatus.READY,
        },
        select: { id: true, title: true },
      });
      if (duplicateDoc) {
        this.logger.warn(
          `Document ${documentId}: identical content already exists in document ${duplicateDoc.id} (${duplicateDoc.title})`,
        );
      }

      // 3. Chunk the extracted text
      const chunks = chunkByHeadings(extractedText, {
        maxChunkSize: 2000,
        minChunkSize: 200,
        overlapSize: 200,
      });

      this.emitProgress(userId, documentId, 'chunking', 35, 'Splitting into chunks...');

      this.logger.log(`Document ${documentId}: extracted ${extractedText.length} chars, ${chunks.length} chunks`);

      // 4. Store chunks in DB (without embeddings)
      await this.prisma.$transaction(
        chunks.map((chunk) =>
          this.prisma.documentChunk.create({
            data: {
              documentId,
              content: chunk.content,
              heading: chunk.heading,
              headingLevel: chunk.headingLevel,
              chunkIndex: chunk.chunkIndex,
              metadata: chunk.metadata,
              contentHash: contentHash(chunk.content),
            },
          }),
        ),
      );

      this.emitProgress(userId, documentId, 'storing_chunks', 45, 'Storing chunks...');

      // 5. Update status to EMBEDDING
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.EMBEDDING,
          chunkCount: chunks.length,
        },
      });

      this.emitProgress(userId, documentId, 'deduplicating', 55, 'Checking for duplicates...');

      // Fetch stored chunks for indexing and embedding
      const storedChunks = await this.prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
        select: { id: true, content: true, heading: true, contentHash: true },
      });

      // Get document title for metadata
      const docRecord = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });
      const docTitle = docRecord?.title ?? 'Untitled';

      // 5b. Deduplicate chunks - find which ones already have embeddings in this user's KB
      const chunkHashes = storedChunks
        .map((c) => c.contentHash)
        .filter((h): h is string => h != null);

      let newChunks = storedChunks;
      let skippedCount = 0;

      if (chunkHashes.length > 0) {
        const existingHashes = await this.prisma.documentChunk.findMany({
          where: {
            contentHash: { in: chunkHashes },
            document: {
              userId,
              status: DocumentStatus.READY,
              id: { not: documentId },
            },
          },
          select: { contentHash: true },
          distinct: ['contentHash'],
        });

        if (existingHashes.length > 0) {
          const alreadyEmbedded = new Set(existingHashes.map((h) => h.contentHash!));
          newChunks = storedChunks.filter(
            (c) => !c.contentHash || !alreadyEmbedded.has(c.contentHash),
          );
          skippedCount = storedChunks.length - newChunks.length;

          if (skippedCount > 0) {
            this.logger.log(
              `Document ${documentId}: dedup skipping ${skippedCount}/${storedChunks.length} chunks (already embedded in user KB)`,
            );
          }
        }
      }

      this.emitProgress(userId, documentId, 'indexing', 70, 'Indexing for retrieval...');

      // 6. Index into ZeroEntropy (primary retrieval, non-fatal)
      if (this.zeRetrieval.isAvailable()) {
        try {
          const collectionName = this.zeRetrieval.collectionNameForUser(userId);
          await this.zeRetrieval.indexDocument(
            collectionName,
            documentId,
            docTitle,
            newChunks,
          );
        } catch (zeError) {
          this.logger.warn(
            `Document ${documentId}: ZeroEntropy indexing failed (non-fatal): ${zeError instanceof Error ? zeError.message : String(zeError)}`,
          );
        }
      }

      this.emitProgress(userId, documentId, 'embedding', 85, 'Generating embeddings...');

      // 7. Generate OpenAI embeddings for pgvector (fallback retrieval, non-fatal)
      if (this.embeddingService.isAvailable() && this.vectorStore.isAvailable()) {
        try {
          const texts = newChunks.map((c) => c.content);
          const embeddings = await this.embeddingService.batchEmbed(texts);

          if (embeddings.length > 0) {
            const chunkEmbeddings = newChunks.map((chunk, i) => ({
              chunkId: chunk.id,
              embedding: embeddings[i],
            }));
            await this.vectorStore.updateChunkEmbeddings(documentId, chunkEmbeddings);
          }
        } catch (embedError) {
          this.logger.warn(
            `Document ${documentId}: embedding failed (non-fatal): ${embedError instanceof Error ? embedError.message : String(embedError)}`,
          );
        }
      } else {
        this.logger.log(`Document ${documentId}: skipping embeddings (vector store stubbed)`);
      }

      // 8. Update status to READY
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.READY,
          processedAt: new Date(),
        },
      });

      this.emitProgress(userId, documentId, 'ready', 100, 'Complete');

      this.logger.log(`Document ${documentId}: ${chunks.length} chunks processed, status=READY`);

      // 8b. Update linked brief status if all documents are now terminal
      await this.updateBriefStatusIfComplete(documentId);

      // 9. Extract entities and index into FalkorDB knowledge graph (non-blocking, costs 1 credit)
      if (this.falkordb.isEnabled()) {
        try {
          // Check if user has enough credits before extraction
          const hasCredits = await this.credits.hasEnoughCredits(userId, ENTITY_EXTRACTION_COST);
          if (!hasCredits) {
            this.logger.warn(
              `Document ${documentId}: skipping entity extraction (insufficient credits, need ${ENTITY_EXTRACTION_COST})`,
            );
            // Surface the warning on the document so the user can see it
            await this.prisma.document.update({
              where: { id: documentId },
              data: { errorMessage: `Knowledge graph indexing skipped: insufficient credits (need ${ENTITY_EXTRACTION_COST}). Purchase credits and re-upload to enable.` },
            });
          } else {
            const extraction = await this.entityExtractor.extractFromChunks(storedChunks);
            if (extraction.entities.length > 0) {
              // Index into user's global KB graph
              const kbGraphName = FalkorDbService.kbGraphName(userId);
              await this.falkordb.indexDocument(
                kbGraphName,
                documentId,
                docTitle,
                extraction.entities,
                extraction.relationships,
              );

              // Also index into the brief's graph if document belongs to a brief
              const docRecord2 = await this.prisma.document.findUnique({
                where: { id: documentId },
                select: { briefId: true, brief: { select: { graphName: true } } },
              });
              if (docRecord2?.brief?.graphName) {
                await this.falkordb.indexDocument(
                  docRecord2.brief.graphName,
                  documentId,
                  docTitle,
                  extraction.entities,
                  extraction.relationships,
                );
                // Update brief entity count
                await this.prisma.pitchBrief.update({
                  where: { id: docRecord2.briefId! },
                  data: { entityCount: { increment: extraction.entities.length } },
                });
                this.logger.log(
                  `Document ${documentId}: also indexed into brief graph ${docRecord2.brief.graphName}`,
                );
              }

              // Charge credits after successful extraction + indexing
              await this.credits.deductCredits(
                userId,
                ENTITY_EXTRACTION_COST,
                CreditReason.ENTITY_EXTRACTION,
                documentId,
              );

              this.logger.log(
                `Document ${documentId}: indexed ${extraction.entities.length} entities into FalkorDB (charged ${ENTITY_EXTRACTION_COST} credit)`,
              );
            }
          }
        } catch (fkError) {
          this.logger.warn(
            `Document ${documentId}: FalkorDB entity extraction/indexing failed (non-blocking): ${fkError instanceof Error ? fkError.message : String(fkError)}`,
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Document ${documentId} processing failed: ${errorMessage}`);

      try {
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            status: DocumentStatus.ERROR,
            errorMessage,
          },
        });
      } catch {
        this.logger.error(`Failed to update error status for document ${documentId}`);
      }

      this.emitProgress(userId, documentId, 'error', -1, errorMessage);

      // Update brief status even on error (brief may transition if all docs are now terminal)
      try {
        await this.updateBriefStatusIfComplete(documentId);
      } catch {
        this.logger.error(`Failed to update brief status after document ${documentId} error`);
      }

      // Don't re-throw: the processor already handled the error by setting ERROR status.
      // Re-throwing caused BullMQ to mark the job as failed with no benefit (no retries configured).
    }
  }

  /**
   * After a document reaches READY or ERROR, check if its linked brief
   * has all documents in a terminal state. If so, transition the brief
   * to READY (if at least one doc succeeded) or ERROR (if all failed).
   */
  private async updateBriefStatusIfComplete(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { briefId: true },
    });
    if (!doc?.briefId) return;

    const briefId = doc.briefId;
    const allDocs = await this.prisma.document.findMany({
      where: { briefId },
      select: { status: true },
    });

    const terminalStatuses: Set<string> = new Set([DocumentStatus.READY, DocumentStatus.ERROR]);
    const allTerminal = allDocs.every((d) => terminalStatuses.has(d.status));
    if (!allTerminal) return;

    const anyReady = allDocs.some((d) => d.status === DocumentStatus.READY);
    const newStatus = anyReady ? BriefStatus.READY : BriefStatus.ERROR;

    await this.prisma.pitchBrief.update({
      where: { id: briefId },
      data: { status: newStatus },
    });

    this.logger.log(
      `Brief ${briefId}: all ${allDocs.length} documents terminal, status=${newStatus}`,
    );

    // Generate AI summary when brief becomes READY
    if (newStatus === BriefStatus.READY) {
      this.generateBriefSummary(briefId).catch((err) => {
        this.logger.warn(`Brief ${briefId}: AI summary generation failed (non-blocking): ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  /**
   * Generate a short AI summary of the brief's ingested content using Sonnet.
   * Reads the first chunks across all documents, asks for a 2-3 sentence overview.
   */
  private async generateBriefSummary(briefId: string): Promise<void> {
    const brief = await this.prisma.pitchBrief.findUnique({
      where: { id: briefId },
      select: { name: true, documents: { select: { title: true }, where: { status: DocumentStatus.READY } } },
    });
    if (!brief) return;

    // Gather first chunks from the brief's documents (up to ~4000 chars)
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        document: { briefId },
      },
      orderBy: { chunkIndex: 'asc' },
      select: { content: true },
      take: 15,
    });

    if (chunks.length === 0) return;

    let contentSample = chunks.map((c) => c.content).join('\n\n');
    if (contentSample.length > 4000) {
      contentSample = contentSample.slice(0, 4000) + '...';
    }

    const docTitles = brief.documents.map((d) => d.title).join(', ');

    const summary = await this.llm.complete(
      [
        {
          role: 'system',
          content: 'You summarize document collections for a presentation tool. Write a concise 2-3 sentence overview of what this content covers. Be specific about topics, data, and key themes. No filler words. No markdown.',
        },
        {
          role: 'user',
          content: `Brief name: "${brief.name}"\nDocuments: ${docTitles}\n\nContent sample:\n${contentSample}`,
        },
      ],
      LlmModel.SONNET,
    );

    if (summary) {
      await this.prisma.pitchBrief.update({
        where: { id: briefId },
        data: { aiSummary: summary.trim() },
      });
      this.logger.log(`Brief ${briefId}: AI summary generated (${summary.trim().length} chars)`);
    }
  }

  private async parseByMimeType(buffer: Buffer, mimeType: string): Promise<ParseResult> {
    if (mimeType === 'application/pdf') {
      return this.pdfParser.parse(buffer);
    }
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.docxParser.parse(buffer);
    }
    if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') {
      return this.markdownParser.parse(buffer);
    }
    if (mimeType === 'text/plain') {
      return this.textParser.parse(buffer);
    }
    if (
      mimeType === 'text/csv' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return this.spreadsheetParser.parse(buffer);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return this.pptxParser.parse(buffer);
    }
    this.logger.warn(`Unknown MIME type "${mimeType}", treating as plain text`);
    return this.textParser.parse(buffer);
  }
}
