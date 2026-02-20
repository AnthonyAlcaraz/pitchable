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
import { chunkByHeadings } from './chunking/heading-chunker.js';
import { CreditReason, DocumentStatus } from '../../generated/prisma/enums.js';
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
    private readonly credits: CreditsService,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { documentId, userId, sourceType, mimeType, s3Key, rawText, url } = job.data;
    this.logger.log(`Processing document ${documentId} (type: ${sourceType})`);

    try {
      // 1. Update status to PARSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PARSING },
      });

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
        // FILE type -- download from S3 and parse by MIME type
        const buffer = await this.s3.getBuffer(s3Key!);
        const result = await this.parseByMimeType(buffer, mimeType!);
        extractedText = result.text;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      // 3. Chunk the extracted text
      const chunks = chunkByHeadings(extractedText, {
        maxChunkSize: 2000,
        minChunkSize: 200,
        overlapSize: 200,
      });

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
            },
          }),
        ),
      );

      // 5. Update status to EMBEDDING
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.EMBEDDING,
          chunkCount: chunks.length,
        },
      });

      // Fetch stored chunks for indexing and embedding
      const storedChunks = await this.prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
        select: { id: true, content: true, heading: true },
      });

      // Get document title for metadata
      const docRecord = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });
      const docTitle = docRecord?.title ?? 'Untitled';

      // 6. Index into ZeroEntropy (primary retrieval, non-fatal)
      if (this.zeRetrieval.isAvailable()) {
        try {
          const collectionName = this.zeRetrieval.collectionNameForUser(userId);
          await this.zeRetrieval.indexDocument(
            collectionName,
            documentId,
            docTitle,
            storedChunks,
          );
        } catch (zeError) {
          this.logger.warn(
            `Document ${documentId}: ZeroEntropy indexing failed (non-fatal): ${zeError instanceof Error ? zeError.message : String(zeError)}`,
          );
        }
      }

      // 7. Generate OpenAI embeddings for pgvector (fallback retrieval, non-fatal)
      if (this.embeddingService.isAvailable()) {
        try {
          const texts = storedChunks.map((c) => c.content);
          const embeddings = await this.embeddingService.batchEmbed(texts);

          if (embeddings.length > 0) {
            const chunkEmbeddings = storedChunks.map((chunk, i) => ({
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
        this.logger.log(`Document ${documentId}: skipping embeddings (no OPENAI_API_KEY)`);
      }

      // 8. Update status to READY
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.READY,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Document ${documentId}: ${chunks.length} chunks processed, status=READY`);

      // 9. Extract entities and index into FalkorDB knowledge graph (non-blocking, costs 1 credit)
      if (this.falkordb.isEnabled()) {
        try {
          // Check if user has enough credits before extraction
          const hasCredits = await this.credits.hasEnoughCredits(userId, ENTITY_EXTRACTION_COST);
          if (!hasCredits) {
            this.logger.warn(
              `Document ${documentId}: skipping entity extraction (insufficient credits, need ${ENTITY_EXTRACTION_COST})`,
            );
          } else {
            const extraction = await this.entityExtractor.extractFromChunks(storedChunks);
            if (extraction.entities.length > 0) {
              const graphName = FalkorDbService.kbGraphName(userId);
              await this.falkordb.indexDocument(
                graphName,
                documentId,
                docTitle,
                extraction.entities,
                extraction.relationships,
              );

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
      // Don't re-throw: the processor already handled the error by setting ERROR status.
      // Re-throwing caused BullMQ to mark the job as failed with no benefit (no retries configured).
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
