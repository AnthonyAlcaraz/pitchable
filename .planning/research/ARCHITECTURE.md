# Architecture Patterns

**Domain:** AI Presentation SaaS (document-to-slides pipeline with image generation)
**Researched:** 2026-02-14
**Confidence:** HIGH (NestJS patterns, BullMQ integration, Marp CLI API verified against official docs)

## Recommended Architecture

SlideForge is a modular monolith built on NestJS, organized into domain-specific modules that communicate through well-defined service interfaces and an async job queue. The system follows a pipeline architecture: documents flow through parsing, chunking, embedding, retrieval, slide structuring, image generation, and export stages. Each stage is an independent NestJS module with clear input/output contracts.

```
                                  +------------------+
                                  |   API Gateway    |
                                  | (NestJS + Guards)|
                                  +--------+---------+
                                           |
                     +---------------------+---------------------+
                     |                     |                     |
              +------+------+    +--------+--------+    +-------+-------+
              |  Auth Module |    | Presentation    |    |  Credit       |
              |  (JWT/Bcrypt)|    | Module          |    |  Module       |
              +--------------+    +--------+--------+    +-------+-------+
                                           |                     |
                     +---------------------+---------------------+
                     |                     |                     |
              +------+------+    +--------+--------+    +-------+-------+
              |  Knowledge  |    | Design          |    |  Image Gen    |
              |  Base Module|    | Constraint      |    |  Module       |
              |  (RAG)      |    | Engine          |    |  (BullMQ)     |
              +--------------+    +-----------------+    +-------+-------+
                     |                                           |
              +------+------+                           +-------+-------+
              |  Document   |                           |  Replicate    |
              |  Parser     |                           |  Client       |
              |  Module     |                           |  + Imgur      |
              +--------------+                           +---------------+
                                           |
                                  +--------+--------+
                                  |  Export Pipeline |
                                  |  (Marp/Reveal/  |
                                  |   GSlides/PDF)  |
                                  +-----------------+
                                           |
                                  +--------+--------+
                                  |  File Storage   |
                                  |  (Local + S3)   |
                                  +-----------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | NestJS Module |
|-----------|---------------|-------------------|---------------|
| **API Gateway** | HTTP routing, request validation, rate limiting, auth guards | All modules via DI | `AppModule` (root) |
| **Auth Module** | User registration, login, JWT issuance/validation, password hashing | Credit Module (new user setup) | `AuthModule` |
| **Knowledge Base Module** | Document storage, chunk management, vector search, RAG retrieval | Document Parser, Presentation Module | `KnowledgeBaseModule` |
| **Document Parser Module** | File upload handling, PDF/DOCX/MD text extraction, chunking, embedding generation | Knowledge Base Module | `DocumentParserModule` |
| **Presentation Module** | Slide structuring algorithm, presentation CRUD, slide ordering, content density management | Design Constraint Engine, Knowledge Base, Export Pipeline, Image Gen | `PresentationModule` |
| **Design Constraint Engine** | Color validation, typography rules, density limits, theme enforcement, auto-fix violations | Presentation Module | `DesignModule` |
| **Image Generation Module** | BullMQ queue management, job creation/tracking, concurrency control | Replicate Client, Credit Module, Presentation Module | `ImageGenModule` |
| **Replicate Client** | API calls to Replicate (Nano Banana Pro), prompt building, image download, Imgur upload | Image Generation Module | `ReplicateModule` (provider within ImageGenModule) |
| **Export Pipeline** | Format-specific rendering (Marp PPTX, Reveal.js HTML, Google Slides API, PDF) | Presentation Module, File Storage | `ExportModule` |
| **Credit Module** | Balance tracking, deduction on usage, purchase records, tier enforcement | Auth Module, Image Gen Module, Export Module | `CreditModule` |
| **File Storage** | Upload/download, signed URL generation, local disk + S3 abstraction | Export Pipeline, Document Parser | `StorageModule` |

### Data Flow

**Complete pipeline from upload to delivery:**

```
1. UPLOAD
   User uploads PDF/DOCX/MD via multipart form
   -> Multer intercepts (FileInterceptor)
   -> File saved to temp storage
   -> Returns document ID

2. PARSE
   DocumentParserModule triggered
   -> pdf-parse (PDFs), mammoth (DOCX), or raw read (MD)
   -> Raw text extracted with metadata (page numbers, headings)
   -> Text stored in documents table

3. CHUNK
   -> RecursiveCharacterTextSplitter: 512 tokens, 50-100 token overlap
   -> Heading-aware splitting (preserve document structure)
   -> Chunks stored in document_chunks table

4. EMBED
   -> OpenAI text-embedding-3-small ($0.02/1M tokens)
   -> Each chunk -> 1536-dim vector
   -> Vectors stored in document_chunks.embedding (pgvector column)
   -> IVFFlat index for approximate nearest neighbor search

5. GENERATE (user triggers presentation creation)
   -> User provides: topic, format, theme, image count
   -> KnowledgeBaseModule: cosine similarity search on topic
   -> Top-K chunks retrieved (K=15-25 depending on deck length)
   -> Chunks re-ranked by relevance score

6. STRUCTURE
   -> PresentationModule: LLM structures content into slides
   -> Rules: 1 idea per slide, max 5 bullets, 8-20 slides
   -> Each slide gets: title, body, type (title/content/diagram/metrics/CTA)
   -> DesignModule validates: colors, fonts, density, contrast

7. IMAGE GENERATION (if image count > 0)
   -> ImageGenModule creates BullMQ jobs
   -> Jobs queued with: slide type, content summary, style
   -> Worker processes jobs sequentially (Replicate rate limit: 600 RPM)
   -> Replicate API (Nano Banana Pro) generates images
   -> Images downloaded and uploaded to Imgur
   -> Imgur URLs stored in slide_images table
   -> Credits deducted per image

8. EXPORT
   -> ExportModule renders final output based on chosen format:
     a. PPTX: Marp markdown generated -> marpCli(['input.md', '--pptx'])
     b. PDF: Marp markdown generated -> marpCli(['input.md', '--pdf'])
     c. Reveal.js: HTML template populated with slide data
     d. Google Slides: OAuth flow -> Slides API batch requests
   -> Output file saved to storage

9. DELIVER
   -> Signed download URL generated (24h expiry)
   -> User notified (polling or WebSocket)
   -> Download tracked for analytics
```

## Module Architecture Details

### NestJS Module Structure

Each domain module follows the same internal pattern.

```
src/
  app.module.ts                    # Root module, imports all feature modules
  common/
    guards/
      jwt-auth.guard.ts            # @UseGuards(JwtAuthGuard)
      credits.guard.ts             # Checks sufficient credits before operation
    interceptors/
      logging.interceptor.ts
      transform.interceptor.ts     # Standard response envelope
    filters/
      http-exception.filter.ts
    decorators/
      current-user.decorator.ts    # @CurrentUser() param decorator
    pipes/
      validation.pipe.ts           # Global class-validator pipe
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/
      jwt.strategy.ts
      local.strategy.ts
    dto/
      register.dto.ts
      login.dto.ts
  knowledge-base/
    knowledge-base.module.ts
    knowledge-base.controller.ts
    knowledge-base.service.ts       # Orchestrates parse->chunk->embed
    document-parser.service.ts      # pdf-parse, mammoth, raw text
    chunker.service.ts              # Text splitting logic
    embedder.service.ts             # OpenAI embedding API calls
    retriever.service.ts            # pgvector similarity search
    dto/
      upload-document.dto.ts
      search-knowledge.dto.ts
  presentation/
    presentation.module.ts
    presentation.controller.ts
    presentation.service.ts         # Orchestrates generation pipeline
    slide-structurer.service.ts     # Content -> slide array algorithm
    dto/
      create-presentation.dto.ts
      update-slide.dto.ts
  design/
    design.module.ts
    design.service.ts               # Main validation entry point
    validators/
      color.validator.ts            # Forbidden pairs, contrast ratio
      typography.validator.ts       # Font whitelist, size minimums
      density.validator.ts          # Bullets, words, slides count
    theme.service.ts                # Theme definitions and application
    data/
      forbidden-combos.json
      themes.json
  image-gen/
    image-gen.module.ts
    image-gen.controller.ts         # Status polling endpoint
    image-gen.service.ts            # Creates BullMQ jobs
    image-gen.processor.ts          # @Processor('image-generation')
    replicate.service.ts            # Replicate API client
    imgur.service.ts                # Imgur upload client
    prompt-builders/
      title.prompt.ts
      problem.prompt.ts
      solution.prompt.ts
      architecture.prompt.ts
      metrics.prompt.ts
      cta.prompt.ts
  export/
    export.module.ts
    export.controller.ts
    export.service.ts               # Format router
    renderers/
      marp.renderer.ts              # Markdown -> PPTX/PDF via Marp CLI API
      revealjs.renderer.ts          # Slide data -> HTML
      google-slides.renderer.ts     # Slides API integration
    templates/
      revealjs/
        base.html
        themes/
  credit/
    credit.module.ts
    credit.controller.ts
    credit.service.ts
    credit.guard.ts                 # Insufficient credits check
  storage/
    storage.module.ts
    storage.service.ts              # Abstract interface
    local-storage.provider.ts       # Dev: local disk
    s3-storage.provider.ts          # Prod: S3-compatible
```

### Database Schema (Prisma)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

model User {
  id             String          @id @default(uuid())
  email          String          @unique
  passwordHash   String
  creditBalance  Int             @default(0)
  tier           Tier            @default(FREE)
  createdAt      DateTime        @default(now())
  documents      Document[]
  presentations  Presentation[]
  creditRecords  CreditRecord[]
}

enum Tier {
  FREE
  PRO
}

model Document {
  id          String          @id @default(uuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  filename    String
  mimeType    String
  rawText     String
  metadata    Json?           // page count, headings, etc.
  createdAt   DateTime        @default(now())
  chunks      DocumentChunk[]
}

model DocumentChunk {
  id          String    @id @default(uuid())
  documentId  String
  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content     String
  chunkIndex  Int
  tokenCount  Int
  heading     String?   // section heading for context
  // pgvector column - use Unsupported until Prisma native support
  // embedding Unsupported("vector(1536)")
  // Query via raw SQL: ORDER BY embedding <=> $1::vector
  createdAt   DateTime  @default(now())

  @@index([documentId])
}

model Presentation {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  title       String
  topic       String
  format      ExportFormat
  theme       String    @default("dark")
  imageCount  Int       @default(0)
  status      PresentationStatus @default(GENERATING)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  slides      Slide[]
  exports     Export[]
}

enum ExportFormat {
  PPTX
  PDF
  REVEALJS
  GOOGLE_SLIDES
}

enum PresentationStatus {
  GENERATING
  IMAGES_PENDING
  READY
  EXPORTED
  FAILED
}

model Slide {
  id               String    @id @default(uuid())
  presentationId   String
  presentation     Presentation @relation(fields: [presentationId], references: [id], onDelete: Cascade)
  orderIndex       Int
  slideType        SlideType
  title            String
  body             String    // Markdown content
  speakerNotes     String?
  imageUrl         String?   // Imgur URL after generation
  imageJobId       String?   // BullMQ job ID for tracking
  imageStatus      ImageStatus @default(NONE)
  createdAt        DateTime  @default(now())

  @@index([presentationId])
  @@unique([presentationId, orderIndex])
}

enum SlideType {
  TITLE
  CONTENT
  PROBLEM
  SOLUTION
  ARCHITECTURE
  METRICS
  CTA
  SECTION_BREAK
}

enum ImageStatus {
  NONE
  QUEUED
  GENERATING
  COMPLETED
  FAILED
}

model Export {
  id               String    @id @default(uuid())
  presentationId   String
  presentation     Presentation @relation(fields: [presentationId], references: [id])
  format           ExportFormat
  fileUrl          String    // Storage URL or signed URL
  fileSize         Int?
  createdAt        DateTime  @default(now())
}

model CreditRecord {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  amount      Int       // positive = purchase, negative = usage
  reason      String    // "image_generation", "purchase", "free_monthly"
  referenceId String?   // presentation or export ID
  createdAt   DateTime  @default(now())

  @@index([userId])
}
```

### Key pgvector Setup

Prisma does not yet have full native vector type support. The recommended workaround (verified via Prisma GitHub issue #18442 and pgvector-node docs):

```typescript
// In a migration SQL file (not Prisma schema):
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "DocumentChunk" ADD COLUMN "embedding" vector(1536);
CREATE INDEX ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

// In retriever.service.ts:
async findSimilarChunks(
  userId: string,
  queryEmbedding: number[],
  topK: number = 15,
): Promise<ChunkWithScore[]> {
  const vectorStr = pgvector.toSql(queryEmbedding);
  return this.prisma.$queryRaw`
    SELECT dc.id, dc.content, dc.heading,
           1 - (dc.embedding <=> ${vectorStr}::vector) AS score
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE d."userId" = ${userId}
    ORDER BY dc.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;
}
```

**Confidence: HIGH** - Prisma raw SQL with pgvector is the documented workaround. Prisma ORM v6.13.0 added pgvector support for Prisma Postgres (their hosted product), but self-hosted Postgres still requires raw SQL for vector operations.

## Patterns to Follow

### Pattern 1: Pipeline Orchestrator

**What:** A service that orchestrates multi-step async operations by managing state transitions.

**When:** Presentation generation involves 5+ sequential steps, each of which can fail independently.

```typescript
// presentation.service.ts
@Injectable()
export class PresentationService {
  async generate(dto: CreatePresentationDto, user: User): Promise<Presentation> {
    // 1. Create presentation record (status: GENERATING)
    const presentation = await this.prisma.presentation.create({
      data: { ...dto, userId: user.id, status: 'GENERATING' },
    });

    try {
      // 2. Retrieve relevant knowledge
      const chunks = await this.knowledgeBase.retrieve(user.id, dto.topic);

      // 3. Structure slides from content
      const slides = await this.slideStructurer.structure(chunks, dto);

      // 4. Validate design constraints (auto-fix violations)
      const validatedSlides = await this.design.validate(slides, dto.theme);

      // 5. Persist slides
      await this.prisma.slide.createMany({
        data: validatedSlides.map((s, i) => ({
          ...s, presentationId: presentation.id, orderIndex: i,
        })),
      });

      // 6. Queue image generation if requested
      if (dto.imageCount > 0) {
        await this.imageGen.queueForPresentation(presentation.id, dto.imageCount);
        await this.updateStatus(presentation.id, 'IMAGES_PENDING');
      } else {
        await this.updateStatus(presentation.id, 'READY');
      }

      return presentation;
    } catch (error) {
      await this.updateStatus(presentation.id, 'FAILED');
      throw error;
    }
  }
}
```

### Pattern 2: BullMQ Worker with Concurrency Control

**What:** Image generation jobs processed by a dedicated worker with rate limiting aligned to Replicate's 600 RPM limit.

**When:** Any async operation that must respect external API rate limits.

```typescript
// image-gen.processor.ts
@Processor('image-generation', {
  concurrency: 5,  // 5 concurrent jobs max
  limiter: {
    max: 10,        // 10 jobs per duration window
    duration: 1000, // per second (600 RPM = 10 RPS)
  },
})
export class ImageGenProcessor extends WorkerHost {
  async process(job: Job<ImageGenJobData>): Promise<ImageGenResult> {
    const { slideId, slideType, contentSummary, style } = job.data;

    // 1. Build prompt from slide type
    const prompt = this.promptBuilder.build(slideType, contentSummary, style);

    // 2. Call Replicate API
    const imageBuffer = await this.replicate.generateImage(prompt);

    // 3. Upload to Imgur
    const imgurUrl = await this.imgur.upload(imageBuffer);

    // 4. Update slide record
    await this.prisma.slide.update({
      where: { id: slideId },
      data: { imageUrl: imgurUrl, imageStatus: 'COMPLETED' },
    });

    // 5. Deduct credit
    await this.credits.deduct(job.data.userId, 1, 'image_generation', slideId);

    return { slideId, imageUrl: imgurUrl };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Image job ${job.id} failed: ${error.message}`);
    // BullMQ handles retries (configured: 3 attempts, exponential backoff)
  }
}
```

### Pattern 3: Strategy Pattern for Export Renderers

**What:** Each export format implemented as a separate renderer behind a common interface.

**When:** Multiple output formats with different rendering logic but same input (slide data).

```typescript
// renderer.interface.ts
export interface PresentationRenderer {
  format: ExportFormat;
  render(presentation: PresentationWithSlides, theme: Theme): Promise<Buffer | string>;
}

// export.service.ts
@Injectable()
export class ExportService {
  private renderers: Map<ExportFormat, PresentationRenderer>;

  constructor(
    private marp: MarpRenderer,
    private revealjs: RevealJsRenderer,
    private googleSlides: GoogleSlidesRenderer,
    private storage: StorageService,
  ) {
    this.renderers = new Map([
      [ExportFormat.PPTX, this.marp],
      [ExportFormat.PDF, this.marp],
      [ExportFormat.REVEALJS, this.revealjs],
      [ExportFormat.GOOGLE_SLIDES, this.googleSlides],
    ]);
  }

  async export(presentationId: string, format: ExportFormat): Promise<Export> {
    const renderer = this.renderers.get(format);
    if (!renderer) throw new BadRequestException(`Unsupported format: ${format}`);

    const presentation = await this.loadPresentation(presentationId);
    const theme = await this.design.getTheme(presentation.theme);
    const output = await renderer.render(presentation, theme);

    const fileUrl = await this.storage.save(output, `${presentationId}.${format}`);
    return this.prisma.export.create({
      data: { presentationId, format, fileUrl },
    });
  }
}
```

### Pattern 4: Marp CLI Programmatic API (Not Shell Exec)

**What:** Use Marp CLI's JavaScript API directly instead of spawning a child process.

**When:** Converting slide markdown to PPTX or PDF.

```typescript
// marp.renderer.ts
import { marpCli } from '@marp-team/marp-cli';
import { writeFile, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

@Injectable()
export class MarpRenderer implements PresentationRenderer {
  format = ExportFormat.PPTX; // Also handles PDF

  async render(
    presentation: PresentationWithSlides,
    theme: Theme,
  ): Promise<Buffer> {
    const markdown = this.buildMarkdown(presentation, theme);
    const tempDir = await mkdtemp(join(tmpdir(), 'slideforge-'));
    const inputPath = join(tempDir, 'slides.md');
    const outputPath = join(tempDir, `slides.${presentation.format === 'PDF' ? 'pdf' : 'pptx'}`);

    await writeFile(inputPath, markdown);

    const formatFlag = presentation.format === 'PDF' ? '--pdf' : '--pptx';
    const exitCode = await marpCli([
      inputPath,
      formatFlag,
      '--output', outputPath,
      '--allow-local-files',
    ]);

    if (exitCode !== 0) {
      throw new InternalServerErrorException('Marp conversion failed');
    }

    return readFile(outputPath);
  }

  private buildMarkdown(pres: PresentationWithSlides, theme: Theme): string {
    const frontmatter = [
      '---',
      'marp: true',
      `theme: ${theme.marpTheme}`,
      `backgroundColor: ${theme.backgroundColor}`,
      `color: ${theme.textColor}`,
      'paginate: true',
      '---',
    ].join('\n');

    const slides = pres.slides
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(slide => {
        let content = `# ${slide.title}\n\n${slide.body}`;
        if (slide.imageUrl) {
          content += `\n\n![bg right:40%](${slide.imageUrl})`;
        }
        return content;
      })
      .join('\n\n---\n\n');

    return `${frontmatter}\n\n${slides}`;
  }
}
```

**Confidence: HIGH** - Marp CLI API verified via DeepWiki documentation showing `marpCli()` accepts args array and returns Promise<exitCode>. The Converter class also supports `convert()`, `convertFile()`, and `convertFileToPPTX()` methods for more granular control.

### Pattern 5: Credit Guard (Pre-check Before Expensive Operations)

**What:** A NestJS guard that checks credit balance before allowing expensive operations to proceed.

**When:** Image generation, exports, or any operation that consumes credits.

```typescript
// credits.guard.ts
@Injectable()
export class CreditsGuard implements CanActivate {
  constructor(private creditService: CreditService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCredits = this.reflector.get<number>('credits', context.getHandler());
    if (!requiredCredits) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const balance = await this.creditService.getBalance(user.id);

    if (balance < requiredCredits) {
      throw new ForbiddenException(
        `Insufficient credits. Required: ${requiredCredits}, Available: ${balance}`,
      );
    }
    return true;
  }
}

// Usage in controller:
@Post(':id/generate-images')
@UseGuards(JwtAuthGuard, CreditsGuard)
@SetMetadata('credits', 6) // or dynamic from DTO
async generateImages(@Param('id') id: string, @Body() dto: GenerateImagesDto) {
  // ...
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Image Generation

**What:** Waiting for Replicate API responses in the HTTP request cycle.

**Why bad:** Image generation takes 5-30 seconds per image. A 12-image deck would block the request for 1-6 minutes. HTTP connections timeout, users see spinning wheels, server threads are consumed.

**Instead:** Queue all image jobs via BullMQ immediately and return a presentation ID with status "IMAGES_PENDING". Client polls for completion or uses WebSocket notification. The pipeline continues asynchronously.

### Anti-Pattern 2: Monolithic Presentation Generator

**What:** A single function/service that handles retrieval, structuring, validation, image gen, and export in one call.

**Why bad:** Impossible to retry failed steps independently. Cannot parallelize. Cannot show progress. Testing requires mocking everything.

**Instead:** Pipeline with discrete stages and status tracking on the Presentation model. Each stage reads the presentation record, performs its work, updates status, and triggers the next stage (or returns to wait for async completion).

### Anti-Pattern 3: Storing Vectors in a Separate Database

**What:** Running a dedicated Chroma, Pinecone, or Weaviate instance alongside PostgreSQL.

**Why bad for this project:** Added operational complexity, another service to manage, data consistency issues between relational data and vectors, separate backup strategy needed. SlideForge's vector needs are simple (per-user document similarity search) and do not require the scale of a dedicated vector DB.

**Instead:** Use pgvector extension in the existing PostgreSQL instance. Single database, single backup, transactional consistency between documents and their embeddings. Sufficient for the expected scale (thousands of users with hundreds of documents each, not millions).

### Anti-Pattern 4: Shell-Exec for Marp Conversion

**What:** Using `child_process.exec('npx @marp-team/marp-cli ...')` for every conversion.

**Why bad:** Process spawning overhead, environment variable leakage risk, harder error handling, no TypeScript type safety, potential command injection if any user input reaches the command.

**Instead:** Use `marpCli()` JavaScript API directly (see Pattern 4 above). Same functionality, native error handling, no shell involved.

### Anti-Pattern 5: Eager Embedding on Upload

**What:** Embedding all chunks immediately during the file upload request.

**Why bad:** A 100-page PDF produces 200+ chunks. Embedding all of them takes 5-10 seconds via the OpenAI API. Users experience a very slow upload.

**Instead:** Upload and parse synchronously (fast: <2s). Queue chunking + embedding as a BullMQ job. Show document as "processing" until embeddings complete. The knowledge base module should expose a status field: `UPLOADED -> PARSING -> EMBEDDING -> READY`.

### Anti-Pattern 6: Flat Credit Deduction (No Pre-Authorization)

**What:** Deducting credits only after image generation completes.

**Why bad:** Race condition where user starts two 12-image decks simultaneously but only has 15 credits. Both pass the initial check, but 24 credits are consumed.

**Instead:** Pre-authorize (reserve) credits when the generation request is created. Reserve 12 credits immediately, deduct as each image completes, release unused if images fail. Use database transactions:

```typescript
async reserveCredits(userId: string, amount: number): Promise<string> {
  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user.creditBalance < amount) throw new ForbiddenException('Insufficient credits');
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: amount } },
    });
    return tx.creditRecord.create({
      data: { userId, amount: -amount, reason: 'reservation' },
    }).then(r => r.id);
  });
}
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|-------------|-------------|-------------|
| **Database** | Single PostgreSQL, pgvector sufficient | Read replicas, connection pooling (PgBouncer) | Partition document_chunks by user, consider dedicated vector DB |
| **Job Queue** | Single Redis, BullMQ sufficient | Redis Sentinel for HA, multiple workers | Redis Cluster, worker auto-scaling, separate queues per priority |
| **Image Generation** | Sequential processing fine | 5 concurrent workers, Replicate 600 RPM is ample | Multiple Replicate accounts, image caching, CDN for generated images |
| **File Storage** | Local disk | S3-compatible (MinIO or AWS S3) | S3 with CloudFront CDN, lifecycle policies for old exports |
| **Embeddings** | OpenAI API, real-time | Batch API (50% cost), background processing | Self-hosted embedding model (e5-large-v2), GPU inference server |
| **Export** | Marp CLI in-process | Marp in separate worker processes (Puppeteer memory) | Dedicated export worker pool, pre-rendered templates |

## Suggested Build Order

The build order is driven by dependency chains. Each phase depends on the previous one.

```
Phase 1: Scaffold + Database + Auth
    No dependencies. Foundation everything else builds on.
    Delivers: Running NestJS app, Prisma schema, JWT auth, Docker Compose

Phase 2: Design Constraint Engine
    Depends on: Schema (themes table)
    No external API dependencies - pure validation logic.
    Build early because it validates ALL downstream output.
    Delivers: Color/typography/density validators, theme system

Phase 3: Knowledge Base + Document Parser
    Depends on: Auth (user-scoped documents), Schema (documents, chunks tables)
    External dependency: OpenAI Embeddings API
    Delivers: File upload, text extraction, chunking, embedding, similarity search

Phase 4: Presentation Engine
    Depends on: Knowledge Base (RAG retrieval), Design Engine (validation)
    This is the core value proposition. Cannot exist without KB and constraints.
    Delivers: Slide structuring, presentation CRUD, design validation

Phase 5: PPTX/PDF Export (Marp)
    Depends on: Presentation Engine (slide data to render)
    First tangible output users can download.
    Delivers: Marp markdown generation, PPTX + PDF export, file storage

Phase 6: Credit System
    Depends on: Auth (user model), can be built in parallel with Phase 5
    Needed before image generation (which costs credits).
    Delivers: Balance tracking, deduction, tier enforcement

Phase 7: Image Generation Queue
    Depends on: Credit System (deduction), Presentation Engine (slide data)
    External dependencies: BullMQ/Redis, Replicate API, Imgur API
    Most complex external integration. Build after core pipeline works.
    Delivers: BullMQ setup, Replicate client, Imgur upload, image-slide integration

Phase 8: Multi-Format Export (Reveal.js, Google Slides)
    Depends on: Presentation Engine, Export Pipeline (extends it)
    External dependency: Google Slides API (OAuth flow)
    Lower priority - PPTX/PDF covers 80% of use cases.
    Delivers: Reveal.js HTML, Google Slides API integration
```

**Why this order:**

1. **Auth + DB first** because every other module needs user context and data persistence.
2. **Design constraints before presentation engine** because the constraint engine validates all generated output. Building it later means retrofitting validation, which leads to inconsistent output quality during development.
3. **Knowledge base before presentation engine** because the presentation engine's primary input is RAG-retrieved content. Without the knowledge base, you can only generate presentations from raw text input (useful for testing but not the product's value prop).
4. **First export format (Marp) before image generation** because this gives end-to-end value (upload doc, generate deck, download PPTX) without the complexity of async image processing. Users can test and provide feedback on the core flow.
5. **Credit system before image generation** because image generation is the primary credit-consuming operation. The guard pattern needs to exist before the expensive operation.
6. **Image generation after core pipeline** because it adds async complexity (BullMQ, external APIs, polling) that should not block the core synchronous flow.
7. **Additional export formats last** because PPTX+PDF via Marp covers the majority use case. Google Slides requires OAuth complexity. Reveal.js is a nice-to-have.

## Infrastructure (Docker Compose for Development)

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: slideforge
      POSTGRES_USER: slideforge
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  # BullBoard UI for monitoring queues during development
  bullboard:
    image: deadly0/bull-board
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3100:3000"
    depends_on:
      - redis

volumes:
  pgdata:
  redisdata:
```

Use `pgvector/pgvector:pg16` Docker image instead of base `postgres:16` to get pgvector pre-installed. This avoids manual extension compilation.

## Sources

- [NestJS Modular Architecture (Medium, Dec 2025)](https://medium.com/@bhagyarana80/nestjs-architecture-that-survived-real-production-traffic-d690fc6afefd) [MEDIUM confidence]
- [NestJS Modular Architecture Principles (Level Up Coding)](https://levelup.gitconnected.com/nest-js-and-modular-architecture-principles-and-best-practices-806c2cb008d5) [MEDIUM confidence]
- [BullMQ NestJS Integration (Official BullMQ Docs)](https://docs.bullmq.io/guide/nestjs) [HIGH confidence]
- [NestJS Queue Management (Official NestJS Docs)](https://docs.nestjs.com/techniques/queues) [HIGH confidence]
- [Marp CLI API Usage (DeepWiki)](https://deepwiki.com/marp-team/marp-cli/8.2-api-usage) [HIGH confidence]
- [Marp CLI GitHub](https://github.com/marp-team/marp-cli) [HIGH confidence]
- [pgvector-node (GitHub)](https://github.com/pgvector/pgvector-node) [HIGH confidence]
- [Prisma pgvector Support Issue #18442](https://github.com/prisma/prisma/issues/18442) [HIGH confidence]
- [Prisma ORM v6.13.0 pgvector for Prisma Postgres](https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres) [HIGH confidence]
- [Replicate Rate Limits (Official Docs)](https://replicate.com/docs/topics/predictions/rate-limits) [HIGH confidence]
- [OpenAI Embedding Pricing](https://platform.openai.com/docs/pricing) [HIGH confidence]
- [Document Chunking Best Practices (Firecrawl, 2025)](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025) [MEDIUM confidence]
- [RAG Chunking Strategies (Weaviate)](https://weaviate.io/blog/chunking-strategies-for-rag) [MEDIUM confidence]
- [Google Slides API Node.js Quickstart (Official)](https://developers.google.com/workspace/slides/api/quickstart/nodejs) [HIGH confidence]
- [NestJS File Upload (Official Docs)](https://docs.nestjs.com/techniques/file-upload) [HIGH confidence]
- [Credit-Based SaaS Billing Architecture (ColorWhistle, 2026)](https://colorwhistle.com/saas-credits-system-guide/) [MEDIUM confidence]
- [AI SaaS Pricing (Metronome, 2025)](https://metronome.com/blog/ai-pricing-in-practice-2025-field-report-from-leading-saas-teams) [MEDIUM confidence]
