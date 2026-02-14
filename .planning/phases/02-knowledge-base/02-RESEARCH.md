# Phase 2: Knowledge Base - Research

**Researched:** 2026-02-14
**Domain:** Document ingestion, parsing, embedding, semantic search, file upload
**Confidence:** HIGH

## Summary

Phase 2 adds document upload, parsing, chunking, embedding, and semantic retrieval to the Pitchable platform. Users upload PDF, DOCX, MD, and TXT files (or paste text/URLs), the system extracts text, chunks it with heading awareness, generates vector embeddings via OpenAI text-embedding-3-small, stores them in pgvector, and exposes a similarity search endpoint for RAG retrieval. The frontend adds a KB management page with drag-and-drop upload, document listing with status indicators, and search.

The existing codebase uses NestJS 11 with Express adapter (NOT Fastify), Prisma 7 with `@prisma/adapter-pg` driver adapter, BullMQ already configured with Redis, MinIO already running in Docker Compose, and pgvector extension already enabled in PostgreSQL. Phase 1 established patterns for BullMQ processors (see `image-generation.processor.ts`), Zustand stores (see `auth.store.ts`), and API client (see `lib/api.ts`) that Phase 2 must follow.

**Primary recommendation:** Use Multer (included with `@nestjs/platform-express`) for file upload to memory buffer, stream files to MinIO via `@aws-sdk/client-s3`, process documents asynchronously via BullMQ `document-processing` queue, use `pdf-parse` + `mammoth` + `marked` for text extraction in Node.js, implement heading-aware chunking as a custom splitter, embed with OpenAI `text-embedding-3-small` (1536 dimensions), store vectors via raw SQL (`prisma.$queryRaw` + `pgvector` npm package), and build an HNSW index for cosine similarity search.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/platform-express` | 11.x | File upload via Multer | Already installed. Multer is bundled with Express adapter. FileInterceptor/ParseFilePipe decorators provide validation. |
| `@aws-sdk/client-s3` | 3.x | MinIO/S3 file storage | S3-compatible client. Works with MinIO (dev) and AWS S3/R2 (prod). `forcePathStyle: true` required for MinIO. |
| `@aws-sdk/s3-request-presigner` | 3.x | Signed download URLs | Generate time-limited download URLs for stored documents. |
| `pdf-parse` | 2.4.x | PDF text extraction | Pure TypeScript, zero native deps, MIT licensed. Handles most PDFs. Node 22 supported. |
| `mammoth` | 1.11.x | DOCX text extraction | `extractRawText()` gives clean text from .docx. `{buffer: buffer}` input works with memory uploads. |
| `marked` | 15.x | Markdown parsing | Parse MD files to extract headings/structure for heading-aware chunking. Use lexer for token extraction. |
| `openai` | 4.x | Embedding generation | Official Node.js SDK. `openai.embeddings.create()` accepts array input for batch embedding. |
| `pgvector` | 0.2.x | Vector SQL helpers | `pgvector.toSql()` converts JS arrays to pgvector-compatible SQL strings for `$queryRaw`. |
| `@mozilla/readability` | 0.5.x | URL content extraction | Mozilla's article extraction algorithm. Strips nav/ads/footer from HTML pages. |
| `jsdom` | 25.x | DOM for Readability | Required by `@mozilla/readability` which needs a DOM environment in Node.js. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-dropzone` | 14.x | Frontend drag-and-drop | File upload UI component. Integrates with shadcn/ui styling. |
| `@types/multer` | 1.x | TypeScript types | Type definitions for Multer file objects. Already a dev dependency pattern in the project. |
| `mime-types` | 2.x | MIME type detection | Validate uploaded file types by checking magic bytes, not just extension. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pdf-parse` | `pymupdf4llm` (Python) | Better table extraction but requires Python worker. Project has no Python runtime. |
| `@mozilla/readability` + `jsdom` | `cheerio` only | Cheerio is lighter but doesn't do article extraction (just CSS selectors). Readability handles arbitrary web pages. |
| Custom heading chunker | `langchain` text splitters | LangChain adds massive dependency tree. Custom heading-aware chunker is ~100 lines and avoids the bloat. |
| `pgvector` npm + raw SQL | `prisma-extension-pgvector` | Community extension exists but less mature. Raw SQL with `pgvector.toSql()` is well-documented and reliable. |
| `@aws-sdk/client-s3` | `minio` npm package | MinIO has its own SDK but `@aws-sdk/client-s3` works with both MinIO and production S3. One client, any provider. |

**Installation:**
```bash
# API (backend)
cd apps/api
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner pdf-parse mammoth marked openai pgvector @mozilla/readability jsdom mime-types
pnpm add -D @types/multer @types/jsdom

# Web (frontend)
cd apps/web
pnpm add react-dropzone
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── knowledge-base/
│   ├── knowledge-base.module.ts       # Module registration, queue setup
│   ├── knowledge-base.controller.ts   # Upload, CRUD, search endpoints
│   ├── knowledge-base.service.ts      # Business logic, orchestration
│   ├── document-processing.processor.ts  # BullMQ worker: parse -> chunk -> embed
│   ├── parsers/
│   │   ├── parser.interface.ts        # Common parser interface
│   │   ├── pdf.parser.ts              # pdf-parse wrapper
│   │   ├── docx.parser.ts            # mammoth wrapper
│   │   ├── markdown.parser.ts         # marked wrapper
│   │   ├── text.parser.ts            # Plain text passthrough
│   │   └── url.parser.ts             # @mozilla/readability + jsdom
│   ├── chunking/
│   │   ├── heading-chunker.ts         # Heading-aware semantic chunking
│   │   └── chunk.interface.ts         # Chunk type definition
│   ├── embedding/
│   │   ├── embedding.service.ts       # OpenAI embedding generation
│   │   └── vector-store.service.ts    # pgvector CRUD via raw SQL
│   ├── storage/
│   │   └── s3.service.ts              # MinIO/S3 upload, download, presigned URLs
│   └── dto/
│       ├── upload-document.dto.ts     # File upload validation
│       ├── create-text-source.dto.ts  # Text/URL input validation
│       ├── search-kb.dto.ts           # Similarity search params
│       └── document-response.dto.ts   # API response shape
│
apps/web/src/
├── pages/
│   └── KnowledgeBasePage.tsx          # KB management page
├── components/
│   └── knowledge-base/
│       ├── FileUploadZone.tsx         # Drag-and-drop upload with react-dropzone
│       ├── DocumentList.tsx           # Document listing with status badges
│       ├── DocumentStatusBadge.tsx    # Status indicator (UPLOADED/PARSING/READY/ERROR)
│       └── KBSearchBar.tsx            # Search documents
└── stores/
    └── kb.store.ts                    # Zustand store for KB state
```

### Pattern 1: Document Processing Pipeline (BullMQ)

**What:** Async multi-stage pipeline: upload -> store in MinIO -> parse -> chunk -> embed -> store vectors
**When to use:** Every document upload triggers this pipeline.

```typescript
// Follow existing pattern from image-generation.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export interface DocumentProcessingJobData {
  documentId: string;
  userId: string;
  sourceType: 'FILE' | 'TEXT' | 'URL';
  mimeType?: string;
  s3Key?: string;
  rawText?: string;
  url?: string;
}

@Processor('document-processing')
export class DocumentProcessingProcessor extends WorkerHost {
  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { documentId } = job.data;

    // 1. Update status: PARSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PARSING' },
    });

    // 2. Extract text (route by sourceType/mimeType)
    const rawText = await this.extractText(job.data);

    // 3. Chunk with heading awareness
    const chunks = this.headingChunker.chunk(rawText);

    // 4. Update status: EMBEDDING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'EMBEDDING' },
    });

    // 5. Generate embeddings in batches of 100
    const embeddings = await this.embeddingService.batchEmbed(
      chunks.map(c => c.content)
    );

    // 6. Store chunks + vectors in pgvector
    await this.vectorStore.insertChunks(documentId, chunks, embeddings);

    // 7. Update status: READY
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'READY',
        chunkCount: chunks.length,
        processedAt: new Date(),
      },
    });
  }
}
```

### Pattern 2: Heading-Aware Semantic Chunking

**What:** Split text on headings (H1-H6) and paragraph boundaries, keeping heading context with each chunk. Fallback to paragraph-level splitting for content without headings.
**When to use:** All document types after text extraction.

```typescript
interface DocumentChunk {
  content: string;         // The chunk text
  heading: string | null;  // Parent heading (e.g., "## Architecture")
  headingLevel: number;    // 1-6 (0 = no heading)
  chunkIndex: number;      // Position in document
  metadata: {
    sourceFile: string;
    pageNumber?: number;
    sectionPath: string[];  // ["Chapter 1", "Architecture", "Overview"]
  };
}

function chunkByHeadings(
  text: string,
  options: {
    maxChunkSize: number;   // 512 tokens (~2000 chars)
    overlapSize: number;    // 50 tokens (~200 chars)
    minChunkSize: number;   // 50 tokens (~200 chars)
  }
): DocumentChunk[] {
  // 1. Split on heading patterns (# H1, ## H2, etc.) or blank-line paragraphs
  // 2. Each section = heading + body paragraphs
  // 3. If section > maxChunkSize: sub-split on paragraphs, keep heading prefix
  // 4. If section < minChunkSize: merge with next section
  // 5. Add overlap: last N chars of previous chunk prepended to current chunk
  // 6. Track heading hierarchy for sectionPath metadata
}
```

### Pattern 3: pgvector Raw SQL with Prisma

**What:** Store and query vector embeddings using `prisma.$queryRaw` with the `pgvector` npm helper.
**When to use:** All embedding storage and similarity search operations.

```typescript
import pgvector from 'pgvector';

// INSERT embedding
async insertChunk(
  documentId: string,
  content: string,
  embedding: number[],
  metadata: object,
) {
  const vectorSql = pgvector.toSql(embedding);
  await this.prisma.$executeRaw`
    INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, metadata, "chunkIndex")
    VALUES (gen_random_uuid(), ${documentId}::uuid, ${content}, ${vectorSql}::vector, ${JSON.stringify(metadata)}::jsonb, ${0})
  `;
}

// SIMILARITY SEARCH
async searchSimilar(
  userId: string,
  queryEmbedding: number[],
  limit: number = 10,
  threshold: number = 0.5,
) {
  const vectorSql = pgvector.toSql(queryEmbedding);
  return this.prisma.$queryRaw`
    SELECT
      dc.id,
      dc.content,
      dc.metadata,
      dc."documentId",
      d.title as "documentTitle",
      1 - (dc.embedding <=> ${vectorSql}::vector) as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."userId" = ${userId}::uuid
      AND 1 - (dc.embedding <=> ${vectorSql}::vector) > ${threshold}
    ORDER BY dc.embedding <=> ${vectorSql}::vector
    LIMIT ${limit}
  `;
}
```

### Pattern 4: File Upload with Express/Multer in NestJS

**What:** Handle multipart file upload using NestJS decorators on Express adapter.
**When to use:** Document upload endpoint.

```typescript
import {
  Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  storage: multer.memoryStorage(),  // Keep in memory buffer, then stream to MinIO
  limits: { fileSize: 20 * 1024 * 1024 },  // 20MB max
}))
async uploadDocument(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /(pdf|docx|doc|txt|text|markdown)/ }),
      ],
    }),
  )
  file: Express.Multer.File,
  @Request() req,
) {
  // file.buffer contains the uploaded file data
  // file.originalname, file.mimetype, file.size available
  return this.kbService.processUpload(req.user.id, file);
}
```

### Pattern 5: MinIO/S3 Service

**What:** Upload files to and download from MinIO using the AWS SDK.
**When to use:** Storing uploaded documents and generating download URLs.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get('S3_BUCKET', 'pitchable-documents');
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', 'http://localhost:9000'),
      region: config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: config.get('S3_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,  // REQUIRED for MinIO
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return key;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }), { expiresIn });
  }
}
```

### Pattern 6: OpenAI Embeddings with Batching

**What:** Generate embeddings for multiple text chunks in batched API calls.
**When to use:** After chunking, before vector storage.

```typescript
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly openai: OpenAI;

  constructor(config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding; // 1536-dimensional vector
  }

  async batchEmbed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    // OpenAI accepts arrays, but max 2048 items per request
    // Process in batches of 100 to stay well within limits
    const BATCH_SIZE = 100;

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      // Response maintains input order
      results.push(...response.data.map(d => d.embedding));
    }
    return results;
  }
}
```

### Anti-Patterns to Avoid

- **Synchronous document processing in the upload handler:** Never parse/embed documents in the HTTP request handler. Always enqueue to BullMQ and return immediately with status UPLOADED. The processor handles the rest async.
- **Fixed-size token chunking without heading awareness:** Splitting text at arbitrary 512-token boundaries destroys section context. Always split on heading/paragraph boundaries first, then subdivide oversized sections.
- **Storing embeddings as JSON arrays in Prisma:** Use pgvector's native `vector(1536)` column type with raw SQL. JSON array storage has no index support and requires loading all vectors into memory for comparison.
- **Using Prisma's `Unsupported("vector")` for queries:** Define the column in a custom migration, use `$queryRaw`/`$executeRaw` for all vector operations. Prisma's schema definition is for documentation; vector operations are raw SQL.
- **Uploading files to local disk:** Files must go to MinIO (S3-compatible). Local disk storage breaks in any deployment where the filesystem is ephemeral.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | `pdf-parse` | PDF format is brutally complex (14 revisions, 1,300+ page spec). Even pdf-parse fails on some PDFs. |
| DOCX text extraction | XML parser for .docx | `mammoth` | DOCX is a ZIP of XML files with complex relationships. mammoth handles paragraph extraction correctly. |
| S3-compatible file storage | Custom HTTP client for MinIO | `@aws-sdk/client-s3` | S3 protocol has signed requests, multipart uploads, presigned URLs. AWS SDK handles all of it. |
| Vector similarity search | Manual cosine distance in JS | pgvector SQL operators (`<=>`) | pgvector runs similarity search in PostgreSQL with HNSW indexing. JS-side computation doesn't scale beyond 1000 vectors. |
| Article extraction from URLs | Custom HTML scraper | `@mozilla/readability` | Web pages have nav bars, ads, comments, footers. Readability strips all of it to extract just the article content. |
| File drag-and-drop UI | Custom drag event handling | `react-dropzone` | Drag-and-drop has cross-browser quirks (drag enter/leave on child elements, drop zone highlighting). react-dropzone handles all of them. |
| Embedding generation | Self-hosted embedding model | OpenAI `text-embedding-3-small` | $0.02/1M tokens is cheaper than running GPU infrastructure for an MVP. Self-host later when volume justifies it. |
| Queue-based async processing | Custom Redis pub/sub | BullMQ | BullMQ provides retry, backoff, concurrency control, dead letter queues, job progress tracking. Custom pub/sub rebuilds all of this poorly. |

**Key insight:** Document processing looks simple (read file, get text) but every file format has edge cases. PDF tables, multi-column layouts, headers/footers, embedded images with OCR text, password protection. DOCX has tracked changes, comments, nested tables, embedded objects. Use established parsers and budget 2-3x expected time for parsing edge cases.

## Common Pitfalls

### Pitfall 1: PDF Parsing Breaks on Complex Layouts
**What goes wrong:** pdf-parse returns garbled text for multi-column PDFs, tables, headers/footers mixed into body text, or scanned-image PDFs (no text layer).
**Why it happens:** pdf-parse uses pdfjs-dist under the hood, which extracts text in reading order. Complex layouts have ambiguous reading order.
**How to avoid:** Accept that PDF parsing is lossy. Store the original file in MinIO. Show users a "review extracted content" step. Support direct text/markdown paste as first-class alternatives. Log parsing quality metrics.
**Warning signs:** Users report "wrong content" or "gibberish" in their knowledge base. Chunks contain header/footer text repeated on every page.

### Pitfall 2: Prisma Migration Drift with Vector Columns
**What goes wrong:** `prisma migrate dev` reports drift when vector columns lack dimension specifications (e.g., `vector` vs `vector(1536)`).
**Why it happens:** Prisma doesn't natively support vector types. Using `Unsupported("vector")` without explicit dimensions causes drift detection to see a schema mismatch.
**How to avoid:** Always specify dimensions in the migration SQL: `vector(1536)`. Use `prisma migrate dev --create-only` to create migration files, then manually add vector column DDL. The project uses Prisma 7.4.0 where the worst drift bugs (from 7.1.0) are fixed.
**Warning signs:** `prisma migrate dev` reporting changes even when nothing changed.

### Pitfall 3: Embedding Entire Documents Synchronously
**What goes wrong:** Upload endpoint hangs for 5+ minutes on large documents. User sees no progress. Connection times out.
**Why it happens:** Parsing + chunking + embedding a 100-page PDF takes significant time. Doing this in the HTTP request handler blocks the response.
**How to avoid:** Return immediately with document status UPLOADED. Process async via BullMQ. Update status through the pipeline (PARSING -> EMBEDDING -> READY). Frontend polls or uses SSE for status updates.
**Warning signs:** Upload endpoint response times > 30 seconds. User reports "upload failed" when it was just slow.

### Pitfall 4: Chunk Boundary Information Loss
**What goes wrong:** Retrieval returns chunks that start mid-sentence or split a table, providing partial information to the LLM.
**Why it happens:** Fixed-size chunking splits at arbitrary positions. Even heading-aware chunking can produce chunks that lack context from the previous section.
**How to avoid:** Add 10-20% overlap between chunks (last ~200 chars of previous chunk prepended). Keep entire tables as single chunks. Attach the parent heading to every chunk so the LLM has section context even for sub-chunks.
**Warning signs:** Retrieved chunks start with "...continued" patterns. LLM generates slides with incomplete data.

### Pitfall 5: Missing File Type Validation (Security)
**What goes wrong:** Malicious files disguised as PDFs exploit parsing library vulnerabilities. Or users upload 500MB files and crash the server.
**Why it happens:** Trusting file extension or MIME type from the client without server-side validation.
**How to avoid:** Validate magic bytes (file header) server-side. Enforce max file size (20MB). Use ParseFilePipe with MaxFileSizeValidator and FileTypeValidator. Sandbox parsing in a try-catch that catches and logs OOM/timeout errors.
**Warning signs:** Server crashes during document processing. Unusual memory spikes.

### Pitfall 6: MinIO Bucket Not Created on First Use
**What goes wrong:** Upload fails with "bucket does not exist" error on first deployment.
**Why it happens:** MinIO starts empty. Unlike AWS S3 where buckets persist, local MinIO volumes may be fresh.
**How to avoid:** Add a bucket creation check in the S3Service `onModuleInit()` lifecycle hook. Use `headBucket` to check, `createBucket` if missing.
**Warning signs:** First upload after `docker-compose up` fails.

### Pitfall 7: pgvector Index Not Created
**What goes wrong:** Vector similarity search takes 500ms+ instead of sub-50ms.
**Why it happens:** Without an HNSW index, pgvector does a sequential scan of all vectors.
**How to avoid:** Create the HNSW index in the Prisma migration SQL. Use `vector_cosine_ops` for cosine distance. For MVP scale (<100K vectors), IVFFlat is also acceptable.
**Warning signs:** Search latency increases linearly with document count.

## Code Examples

### Document Parsing: PDF
```typescript
// Source: pdf-parse npm documentation
import pdfParse from 'pdf-parse';

async parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text; // Full extracted text
  // data.numpages, data.info (metadata) also available
}
```

### Document Parsing: DOCX
```typescript
// Source: mammoth npm documentation
import mammoth from 'mammoth';

async parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value; // Plain text, paragraphs separated by \n\n
  // result.messages contains warnings
}
```

### Document Parsing: Markdown
```typescript
// Source: marked npm documentation
import { marked } from 'marked';

async parseMarkdown(text: string): Promise<{ text: string; headings: { level: number; text: string; position: number }[] }> {
  const tokens = marked.lexer(text);
  const headings: { level: number; text: string; position: number }[] = [];
  let plainText = '';
  let position = 0;

  for (const token of tokens) {
    if (token.type === 'heading') {
      headings.push({ level: token.depth, text: token.text, position });
    }
    if ('text' in token) {
      plainText += token.text + '\n';
      position++;
    }
  }

  return { text: plainText, headings };
}
```

### Document Parsing: URL
```typescript
// Source: @mozilla/readability npm + jsdom
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async parseUrl(url: string): Promise<{ title: string; content: string }> {
  const response = await fetch(url);
  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) throw new Error(`Could not extract content from ${url}`);

  return {
    title: article.title,
    content: article.textContent, // Clean text without HTML
  };
}
```

### Prisma Schema for KB Models (migration SQL)
```sql
-- Custom migration: add KB tables with pgvector
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PARSING', 'EMBEDDING', 'READY', 'ERROR');
CREATE TYPE "DocumentSourceType" AS ENUM ('FILE', 'TEXT', 'URL');

CREATE TABLE "Document" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "sourceType" "DocumentSourceType" NOT NULL,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "s3Key" TEXT,
  "sourceUrl" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "chunkCount" INTEGER DEFAULT 0,
  "errorMessage" TEXT,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "DocumentChunk" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "heading" TEXT,
  "headingLevel" INTEGER DEFAULT 0,
  "chunkIndex" INTEGER NOT NULL,
  "embedding" vector(1536),
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX "Document_userId_idx" ON "Document"("userId");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- HNSW index for fast cosine similarity search
CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Prisma Schema Declaration (schema.prisma additions)
```prisma
// Add to existing schema.prisma for Prisma awareness (vector ops via raw SQL)

enum DocumentStatus {
  UPLOADED
  PARSING
  EMBEDDING
  READY
  ERROR
}

enum DocumentSourceType {
  FILE
  TEXT
  URL
}

model Document {
  id           String             @id @default(uuid()) @db.Uuid
  userId       String             @db.Uuid
  title        String
  sourceType   DocumentSourceType
  mimeType     String?
  fileSize     Int?
  s3Key        String?
  sourceUrl    String?
  status       DocumentStatus     @default(UPLOADED)
  chunkCount   Int                @default(0)
  errorMessage String?
  processedAt  DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  user   User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks DocumentChunk[]

  @@index([userId])
  @@index([status])
}

model DocumentChunk {
  id           String   @id @default(uuid()) @db.Uuid
  documentId   String   @db.Uuid
  content      String   @db.Text
  heading      String?
  headingLevel Int      @default(0)
  chunkIndex   Int
  embedding    Unsupported("vector(1536)")?
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}
```

**Note:** The `embedding` column uses `Unsupported("vector(1536)")` for schema awareness. All vector operations (INSERT, SELECT with similarity) MUST use raw SQL via `prisma.$executeRaw` / `prisma.$queryRaw` with `pgvector.toSql()`.

### Frontend: File Upload Zone
```tsx
// Using react-dropzone with shadcn/ui styling
import { useDropzone } from 'react-dropzone';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
  'text/plain': ['.txt'],
};

function FileUploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024, // 20MB
    onDrop: onUpload,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">
        {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to select'}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        PDF, DOCX, MD, TXT up to 20MB
      </p>
    </div>
  );
}
```

### Frontend: API Client Upload Method
```typescript
// Extend the existing ApiClient in lib/api.ts
// File uploads need FormData, not JSON
async uploadFile(url: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  const { accessToken } = this.getTokens();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type - browser sets multipart boundary automatically
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  return response.json();
}
```

### RAG Retrieval Endpoint
```typescript
// POST /knowledge-base/search
async search(userId: string, query: string, limit = 10): Promise<SearchResult[]> {
  // 1. Embed the query
  const queryEmbedding = await this.embeddingService.embed(query);

  // 2. Similarity search via pgvector
  const chunks = await this.vectorStore.searchSimilar(
    userId,
    queryEmbedding,
    limit,
    0.5, // minimum similarity threshold
  );

  // 3. Return with source attribution
  return chunks.map(chunk => ({
    content: chunk.content,
    similarity: chunk.similarity,
    documentTitle: chunk.documentTitle,
    documentId: chunk.documentId,
    heading: chunk.heading,
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed-size 512-token chunking | Heading-aware semantic chunking with overlap | 2024-2025 | 20-45% better retrieval accuracy. Preserves document structure. |
| Separate vector DB (Pinecone, Weaviate) | pgvector in PostgreSQL | 2024-2025 (pgvector 0.7+ HNSW) | One database for everything. HNSW index provides sub-50ms search at 100K+ vectors. |
| `text-embedding-ada-002` (1536-dim) | `text-embedding-3-small` (1536-dim) | Jan 2024 | Better MTEB scores (62.3 vs 61.0), same dimensions, 5x cheaper ($0.02 vs $0.10 per 1M tokens). |
| Python-only document pipelines | Node.js pdf-parse/mammoth | 2024-2025 | pdf-parse v2.4+ is pure TypeScript, no Python needed. Simpler stack for all-JS projects. |
| Express multer manual setup | NestJS FileInterceptor + ParseFilePipe | NestJS 10+ | Declarative validation with composable validators. Type-safe file handling. |
| Prisma with Rust engine | Prisma 7 pure JS | Jan 2025 | Faster cold starts, no binary compatibility issues, same Prisma DX. |

**Deprecated/outdated:**
- `text-embedding-ada-002`: Superseded by `text-embedding-3-small` and `text-embedding-3-large`. Still works but costs more with lower quality.
- Prisma 6.x with Rust engine: Prisma 7 removed the Rust query engine. Existing `@prisma/adapter-pg` pattern in the project is correct for Prisma 7.
- `@fastify/multipart` for file upload: Not needed. This project uses Express adapter, which includes Multer out of the box.

## Critical Codebase Facts

These observations from the existing Phase 1 codebase directly constrain Phase 2 implementation:

1. **Express adapter, NOT Fastify:** `main.ts` uses `NestFactory.create(AppModule)` with `@nestjs/platform-express`. File uploads use Multer (FileInterceptor), not `@fastify/multipart`.

2. **Prisma 7 with driver adapter:** `PrismaService` extends `PrismaClient` with `PrismaPg` adapter using `connectionString`. All raw SQL goes through this same client via `$queryRaw` / `$executeRaw`.

3. **BullMQ pattern established:** `ImageGenerationProcessor` extends `WorkerHost` with `@Processor('image-generation')`. Document processing must follow the same pattern with `@Processor('document-processing')`.

4. **Queue registration in module:** `BullModule.registerQueue({ name: 'image-generation' })` is in `ImagesModule`. Knowledge base module must register `BullModule.registerQueue({ name: 'document-processing' })`.

5. **BullMQ global config in AppModule:** `BullModule.forRoot()` with Redis connection is already configured in `app.module.ts`. No additional Redis setup needed.

6. **User model needs `documents` relation:** Current `User` model has `presentations` and `creditTransactions` relations. Must add `documents Document[]` relation.

7. **API client uses `fetch` not `axios`:** Despite `axios` being in `package.json`, the actual `lib/api.ts` uses native `fetch`. File upload must use `fetch` with `FormData`.

8. **Zustand persist pattern:** Auth store uses `persist` middleware with `partialize`. KB store should use the same pattern if any state needs persistence.

9. **pgvector extension already enabled:** `init-db.sql` runs `CREATE EXTENSION IF NOT EXISTS vector;` on container init. No additional setup needed.

10. **MinIO running but no bucket:** Docker Compose runs MinIO on ports 9000/9001. No bucket has been created yet. S3Service must create it on startup.

## Open Questions

1. **pdf-parse vs pymupdf4llm for table-heavy PDFs**
   - What we know: pdf-parse handles simple PDFs well but struggles with tables and multi-column layouts. pymupdf4llm is better but requires Python.
   - What's unclear: What percentage of user documents will have complex layouts?
   - Recommendation: Start with pdf-parse (Node.js only). Add a "parsing quality" feedback mechanism. If users frequently report bad extraction, add a Python worker with pymupdf4llm later.

2. **Optimal chunk size for presentation RAG**
   - What we know: Research recommends 400-512 tokens with 10-20% overlap. But presentation generation may benefit from smaller chunks (a single data point per slide).
   - What's unclear: Ideal chunk size for this specific use case.
   - Recommendation: Default to 512 tokens with 50-token overlap. Make configurable. Test with real documents during Phase 2 validation.

3. **Document size limits**
   - What we know: 20MB file size is reasonable. But a 200-page PDF could generate 500+ chunks and cost $0.01+ in embedding fees per document.
   - What's unclear: What's the cost-acceptable upper bound for free tier users?
   - Recommendation: Start with 20MB / 100 pages max. Track per-user embedding costs. Adjust limits based on actual usage patterns.

4. **Status polling vs SSE for document processing progress**
   - What we know: Socket.io is planned for Phase 3 (chat). Using it in Phase 2 adds premature complexity.
   - What's unclear: Whether polling is acceptable UX for document processing.
   - Recommendation: Use polling (GET `/knowledge-base/documents/:id`) every 2 seconds during processing. Switch to Socket.io events in Phase 3 when the infrastructure is built.

## Sources

### Primary (HIGH confidence)
- NestJS File Upload Documentation (deepwiki.com/nestjs/nest/9.3-file-upload-handling) - Express/Multer integration
- pgvector-node GitHub (github.com/pgvector/pgvector-node) - Prisma raw SQL patterns with `toSql()`
- Prisma issue #28867 (github.com/prisma/prisma/issues/28867) - Unsupported("vector") drift fix in 7.2.0
- OpenAI API Reference (platform.openai.com/docs/api-reference/embeddings) - embeddings.create parameters
- Existing codebase: `apps/api/src/images/image-generation.processor.ts` - BullMQ processor pattern
- Existing codebase: `apps/api/src/prisma/prisma.service.ts` - Prisma 7 driver adapter pattern
- Existing codebase: `apps/api/src/main.ts` - Express adapter confirmation

### Secondary (MEDIUM confidence)
- pdf-parse npm (npmjs.com/package/pdf-parse) - v2.4.x capabilities and Node.js support
- mammoth npm (npmjs.com/package/mammoth) - extractRawText API
- @mozilla/readability npm - Article extraction from arbitrary web pages
- WebSearch: Semantic chunking best practices 2025 - Heading-aware splitting recommendations
- WebSearch: react-dropzone + shadcn/ui patterns - File upload component patterns

### Tertiary (LOW confidence)
- WebSearch: Optimal chunk size - Varies by use case, 400-512 tokens is a starting point
- WebSearch: pdf-parse table handling quality - Community reports vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm, versions confirmed, existing codebase patterns established
- Architecture: HIGH - BullMQ processor pattern, Prisma raw SQL, S3 client all have existing codebase precedent
- Pitfalls: HIGH - PDF parsing, vector drift, sync processing are well-documented issues with clear mitigations
- Chunking strategy: MEDIUM - Heading-aware approach is well-supported in literature but optimal params need testing
- Frontend patterns: HIGH - react-dropzone + shadcn/ui integration is straightforward with established patterns

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stable libraries, no major version changes expected)
