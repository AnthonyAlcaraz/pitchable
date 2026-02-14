import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseController } from './knowledge-base.controller.js';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { S3Service } from './storage/s3.service.js';
import { DocumentProcessingProcessor } from './document-processing.processor.js';
import { PdfParser } from './parsers/pdf.parser.js';
import { DocxParser } from './parsers/docx.parser.js';
import { MarkdownParser } from './parsers/markdown.parser.js';
import { TextParser } from './parsers/text.parser.js';
import { UrlParser } from './parsers/url.parser.js';
import { EmbeddingService } from './embedding/embedding.service.js';
import { VectorStoreService } from './embedding/vector-store.service.js';
import { EdgeQuakeService } from './edgequake/edgequake.service.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.registerQueue({ name: 'document-processing' }),
  ],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    S3Service,
    DocumentProcessingProcessor,
    PdfParser,
    DocxParser,
    MarkdownParser,
    TextParser,
    UrlParser,
    EmbeddingService,
    VectorStoreService,
    EdgeQuakeService,
  ],
  exports: [KnowledgeBaseService, S3Service, EmbeddingService, VectorStoreService, EdgeQuakeService],
})
export class KnowledgeBaseModule {}
