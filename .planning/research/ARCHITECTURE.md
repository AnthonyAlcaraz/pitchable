# Architecture Research

**Domain:** AI Presentation SaaS (Knowledge Base to Slide Deck)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Web App      │  │  API Clients │  │  Webhook Receivers       │   │
│  │  (React/Next) │  │  (REST)      │  │  (Replicate callbacks)   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘   │
│         │                 │                        │                 │
├─────────┴─────────────────┴────────────────────────┴─────────────────┤
│                        API Gateway Layer                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    NestJS API Server                          │    │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐   │    │
│  │  │ Auth   │ │ Deck CRUD│ │ Credits  │ │ Format Selector │   │    │
│  │  └────────┘ └──────────┘ └──────────┘ └─────────────────┘   │    │
│  │  ┌────────────────────┐ ┌────────────────────────────────┐   │    │
│  │  │ Design Constraint  │ │ Webhook Ingress                │   │    │
│  │  │ Validator          │ │ (Replicate callbacks)          │   │    │
│  │  └────────────────────┘ └────────────────────────────────┘   │    │
│  └──────────────────────────────┬───────────────────────────────┘    │
│                                 │                                    │
├─────────────────────────────────┴────────────────────────────────────┤
│                        Queue Layer (BullMQ + Redis)                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐      │
│  │ image-gen  │ │ doc-ingest │ │ export     │ │ rag-query    │      │
│  │ queue      │ │ queue      │ │ queue      │ │ queue        │      │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘      │
│        │              │              │               │               │
├────────┴──────────────┴──────────────┴───────────────┴───────────────┤
│                        Worker Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Python Worker:   │  │ Python Worker:   │  │ Node Worker:       │  │
│  │ Image Generation │  │ Doc Ingestion &  │  │ Export Engine      │  │
│  │ (Replicate API)  │  │ RAG Pipeline     │  │ (PPTX/PDF/HTML/    │  │
│  │                  │  │ (Embeddings,     │  │  Google Slides)    │  │
│  │                  │  │  Parsing, Vector │  │                    │  │
│  │                  │  │  Store)          │  │                    │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                        Data Layer                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ PostgreSQL   │  │ pgvector /   │  │ S3-Compatible│               │
│  │ (Users,Decks,│  │ Qdrant       │  │ (Uploads,    │               │
│  │  Credits,    │  │ (Embeddings) │  │  Generated   │               │
│  │  Jobs)       │  │              │  │  Assets)     │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐                                                    │
│  │ Redis        │                                                    │
│  │ (Queue state,│                                                    │
│  │  Cache,      │                                                    │
│  │  Sessions)   │                                                    │
│  └──────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| NestJS API | Auth, deck CRUD, credit tracking, format selection, design validation, job dispatch | NestJS modules with guards, interceptors, DTOs |
| BullMQ Queues | Async job routing between API and workers | 4 queues: image-gen, doc-ingest, export, rag-query |
| Python Image Worker | Calls Replicate API, handles webhook callbacks, stores results in S3 | Python BullMQ consumer + httpx for Replicate |
| Python RAG Worker | PDF/DOCX parsing, chunking, embedding, vector storage, semantic retrieval | LangChain/LlamaIndex + sentence-transformers |
| Node Export Worker | Generates PPTX, PDF, Reveal.js HTML, Google Slides from slide data model | PptxGenJS, Marp CLI, Google Slides API client |
| Design Constraint Engine | Validates color palettes, typography, content density rules | TypeScript validator module within NestJS |
| PostgreSQL | Users, decks, slides, credits, job metadata | Prisma ORM |
| Vector Store | Document embeddings for RAG retrieval | pgvector extension (start), Qdrant (scale) |
| S3-Compatible Storage | Uploaded documents, generated images, exported files | MinIO (dev), AWS S3 / Cloudflare R2 (prod) |
| Redis | BullMQ backend, session cache, rate limiting | Single Redis instance, separate DB numbers |

## Recommended Project Structure

```
slideforge/
├── apps/
│   ├── api/                        # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/               # JWT auth, guards, strategies
│   │   │   ├── users/              # User CRUD, credit tracking
│   │   │   ├── decks/              # Deck CRUD, slide ordering
│   │   │   ├── slides/             # Slide data model, content
│   │   │   ├── jobs/               # Job dispatch, status tracking
│   │   │   ├── design/             # Design constraint engine
│   │   │   │   ├── tokens/         # Color, typography, spacing tokens
│   │   │   │   ├── validators/     # Constraint validators
│   │   │   │   └── presets/        # Built-in design presets
│   │   │   ├── webhooks/           # Replicate callback handlers
│   │   │   ├── storage/            # S3 presigned URL generation
│   │   │   ├── export/             # Export job dispatch + format router
│   │   │   └── common/             # Shared DTOs, interfaces, utils
│   │   └── prisma/                 # Database schema, migrations
│   │
│   ├── workers/                    # Python worker processes
│   │   ├── image_gen/              # Replicate API integration
│   │   │   ├── worker.py           # BullMQ consumer
│   │   │   ├── replicate_client.py # Replicate API wrapper
│   │   │   └── prompt_builder.py   # Image prompt construction
│   │   ├── doc_ingest/             # Document ingestion pipeline
│   │   │   ├── worker.py           # BullMQ consumer
│   │   │   ├── parsers/            # PDF, DOCX, TXT parsers
│   │   │   ├── chunker.py          # Semantic chunking logic
│   │   │   └── embedder.py         # Embedding generation
│   │   └── rag/                    # RAG query processing
│   │       ├── worker.py           # BullMQ consumer
│   │       ├── retriever.py        # Vector similarity search
│   │       └── synthesizer.py      # Context assembly for LLM
│   │
│   └── export-worker/              # Node.js export worker
│       ├── src/
│       │   ├── worker.ts           # BullMQ consumer
│       │   ├── renderers/          # Format-specific renderers
│       │   │   ├── pptx.renderer.ts    # PptxGenJS
│       │   │   ├── pdf.renderer.ts     # Marp CLI or Puppeteer
│       │   │   ├── revealjs.renderer.ts # HTML generation
│       │   │   └── gslides.renderer.ts  # Google Slides API
│       │   ├── adapter.ts          # Slide model -> renderer adapter
│       │   └── common/             # Shared rendering utilities
│       └── templates/              # Slide layout templates
│
├── packages/
│   ├── slide-model/                # Shared slide data model (TypeScript)
│   │   ├── src/
│   │   │   ├── types.ts            # Core slide/deck/element types
│   │   │   ├── schema.ts           # JSON Schema validation
│   │   │   └── transforms.ts       # Model transformation utilities
│   │   └── package.json
│   │
│   └── design-tokens/              # Shared design token definitions
│       ├── src/
│       │   ├── colors.ts           # Color palette definitions
│       │   ├── typography.ts       # Font scale, weights, line heights
│       │   ├── spacing.ts          # Spacing scale
│       │   └── presets.ts          # Pre-built design presets
│       └── package.json
│
├── docker-compose.yml              # Dev environment
├── turbo.json                      # Turborepo config (monorepo)
└── package.json                    # Root workspace
```

### Structure Rationale

- **`apps/api/`:** NestJS modular architecture. Each domain (decks, slides, users) is a self-contained NestJS module with its own controllers, services, and DTOs. The design constraint engine lives here because validation happens at the API boundary before jobs are dispatched.
- **`apps/workers/`:** Python workers as separate processes consuming BullMQ queues. Each worker type is isolated with its own dependencies and can scale independently.
- **`apps/export-worker/`:** Separate Node.js process for export rendering. Lives outside the API to avoid blocking the main server. Uses the renderer pattern to isolate format-specific code.
- **`packages/slide-model/`:** The canonical slide data model shared between API and export worker. This is the critical boundary -- everything upstream produces this model, everything downstream consumes it.
- **`packages/design-tokens/`:** Design constraint definitions shared across components. Validators in the API reference these; renderers in the export worker consume them.

## Key Architecture Decisions

### Decision 1: BullMQ as the Cross-Language Bridge (Not HTTP, Not Child Processes)

**Recommendation:** Use BullMQ queues (backed by Redis) for all communication between NestJS and Python workers.

**Why not HTTP microservices:** HTTP adds service discovery complexity, connection pooling, timeout management, and circuit breaking. For internal worker communication where jobs are inherently async, a message queue is simpler and more resilient. HTTP microservices make sense for synchronous request-response patterns between independent teams; they add unnecessary overhead for a single-team product.

**Why not child processes:** Child processes (spawning Python from Node) create tight coupling, make scaling impossible (can only scale vertically), and complicate error handling. A dead child process kills the parent's reliability.

**Why BullMQ specifically:** Native support in both Node.js and Python. Job retry, backoff, priority, and rate limiting built in. Workers scale independently by adding processes. BullMQ Python is newer and less battle-tested than the Node.js version, but it covers the needed functionality (consume jobs, report completion, handle failures). The alternative (RabbitMQ or Kafka) adds operational complexity that is unwarranted at this scale.

**Trade-offs:**
- PRO: Single communication pattern for all async work. No HTTP overhead between internal services.
- PRO: Job visibility via BullBoard UI. Retry logic, dead letter queues, rate limiting out of the box.
- CON: Python BullMQ library is less mature. Monitor for edge cases, especially around connection recovery.
- CON: Redis becomes a hard dependency and single point of failure (mitigate with Redis Sentinel later).

### Decision 2: RAG Pipeline Lives in Python

**Recommendation:** The entire RAG pipeline (document parsing, chunking, embedding, vector storage, retrieval) runs as Python workers, not in Node.js.

**Rationale:** Python has unstructured.io, PyMuPDF, python-docx for parsing. sentence-transformers, OpenAI, Cohere for embeddings. LangChain, LlamaIndex for RAG orchestration. Recursive/semantic chunkers with overlap. GPU-accelerated inference when needed. Node.js RAG libraries (LangChain.js, Vercel AI SDK) exist but lag behind in parsing quality, embedding model variety, and advanced retrieval patterns (hybrid search, re-ranking, query expansion). For a product where retrieval quality directly determines slide quality, use the best tools.

**How it works:** NestJS dispatches jobs to `doc-ingest` and `rag-query` queues. Python workers consume them. Results return via BullMQ job completion (the Node.js producer can await or poll for the job result). The NestJS API never directly calls Python code.

### Decision 3: Design Constraint Engine as In-Process Validator Module

**Recommendation:** The design constraint engine is a NestJS module (TypeScript) that validates slide data against design tokens. It runs in-process within the API server, not as a separate microservice or middleware layer.

**Why in-process, not a microservice:** Design validation is CPU-cheap pure data checking (color contrast ratios, font size ranges, bullet count limits). An HTTP roundtrip to a separate service would take longer than the validation itself. Keep it in-process.

**Why a module with validators, not middleware:** NestJS middleware runs before route handlers and lacks access to the full request context. Design validation needs the complete slide data model and the associated theme configuration. A service-layer validator called explicitly from controllers/services gives full control over when and how validation runs.

**Structure:**
- `design/tokens/` -- JSON definitions of color palettes, typography scales, spacing. Data-driven, no code changes to update.
- `design/validators/` -- Individual validator classes (ColorValidator, TypographyValidator, DensityValidator). Each checks one constraint category and returns structured violations.
- `design/presets/` -- Pre-built theme presets that bundle tokens into named configurations.
- `design/design.service.ts` -- Orchestrator that runs all validators and aggregates results.

**Validation runs at two points:**
1. On slide create/update (API boundary) -- catches user-provided content that violates constraints.
2. Before export dispatch -- final check that the deck is valid before rendering.

### Decision 4: Canonical Slide Data Model Separated from Export Formats

**Recommendation:** Define a single, format-agnostic JSON data model for slides. This is the architectural spine of the system. Everything upstream (RAG, LLM generation, user edits) produces this model. Everything downstream (PPTX, PDF, Reveal.js, Google Slides) consumes it.

**The boundary:** The slide model describes *what* is on a slide (text with a role, image with a position, chart with data). Export renderers decide *how* to render it in their target format.

**Example model:**
```typescript
interface Deck {
  id: string;
  title: string;
  theme: ThemeConfig;
  slides: Slide[];
  metadata: DeckMetadata;
}

interface Slide {
  id: string;
  layout: LayoutType;       // 'title' | 'content' | 'two-column' | 'image-full'
  elements: SlideElement[];
  speakerNotes?: string;
  transition?: TransitionConfig;
}

type SlideElement =
  | TextElement
  | ImageElement
  | ChartElement
  | ShapeElement;

interface TextElement {
  type: 'text';
  content: string;           // Markdown-formatted text
  role: 'title' | 'subtitle' | 'body' | 'caption' | 'bullet-list';
  position: BoundingBox;     // { x, y, width, height } in percentage
  style?: TextStyleOverride; // Optional overrides to theme defaults
}

interface ImageElement {
  type: 'image';
  src: string;               // S3 URL or asset reference
  alt: string;
  position: BoundingBox;
  fit: 'cover' | 'contain' | 'fill';
}

interface ThemeConfig {
  colors: ColorPalette;
  typography: TypographyScale;
  spacing: SpacingScale;
}
```

**The `role` field is the key abstraction.** A TextElement with `role: 'title'` becomes a Title placeholder in PPTX, an `<h1>` in Reveal.js, a Title layout in Google Slides. The renderer maps roles to format-specific implementations.

### Decision 5: Renderer Adapter Pattern for Format Isolation

**Recommendation:** Each export format gets its own renderer class behind a common interface. A router dispatches to the correct renderer. Format-specific code never leaks into the slide model, API, or other renderers.

**How format-specific optimizations work:** Each renderer owns its format's quirks. PPTX renderer handles absolute positioning in EMU units. Reveal.js renderer generates CSS classes and fragment animations. Google Slides renderer batches API requests. PDF renderer runs Puppeteer or Marp CLI. None of these details escape the renderer boundary.

**For edge cases that cannot be expressed in the abstract model:** Add an optional `formatHints` field to SlideElement. This field is a map of format-specific hints that renderers can optionally read. The model stays clean; renderers get escape hatches.

```typescript
interface SlideElement {
  // ... core fields
  formatHints?: {
    pptx?: { animation?: string };
    revealjs?: { fragment?: boolean; fragmentIndex?: number };
    googleSlides?: { speakerNotesAsNotes?: boolean };
  };
}
```

## Architectural Patterns

### Pattern 1: BullMQ Cross-Language Job Dispatch

```typescript
// NestJS API: Dispatch image generation job
@Injectable()
export class ImageService {
  constructor(@InjectQueue('image-gen') private imageQueue: Queue) {}

  async generateImage(deckId: string, slideId: string, prompt: string) {
    const job = await this.imageQueue.add('generate', {
      deckId,
      slideId,
      prompt,
      style: 'professional',
      dimensions: { width: 1920, height: 1080 },
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      priority: 2,
    });
    return job.id;
  }
}
```

```python
# Python Worker: Consume image generation job
from bullmq import Worker
import httpx

async def process_image(job, token):
    data = job.data
    prompt = data["prompt"]

    # Call Replicate API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Bearer {REPLICATE_TOKEN}"},
            json={
                "model": "stability-ai/sdxl",
                "input": {"prompt": prompt, "width": data["dimensions"]["width"]},
                "webhook": WEBHOOK_URL,
                "webhook_events_filter": ["completed"],
            },
        )
    prediction = response.json()

    # For webhook mode: return prediction ID, let webhook handler update status
    # For polling mode: await completion and upload to S3
    return {"predictionId": prediction["id"], "slideId": data["slideId"]}

worker = Worker("image-gen", process_image, {"connection": redis_opts})
```

### Pattern 2: Renderer Adapter for Multi-Format Export

```typescript
// Common interface
interface SlideRenderer {
  render(deck: Deck): Promise<ExportResult>;
}

// Router
class ExportAdapter {
  private renderers: Map<ExportFormat, SlideRenderer> = new Map([
    ['pptx', new PptxRenderer()],
    ['pdf', new PdfRenderer()],
    ['revealjs', new RevealJsRenderer()],
    ['google-slides', new GoogleSlidesRenderer()],
  ]);

  async export(deck: Deck, format: ExportFormat): Promise<ExportResult> {
    const renderer = this.renderers.get(format);
    if (!renderer) throw new Error(`Unsupported format: ${format}`);
    return renderer.render(deck);
  }
}

// Format-specific renderer (PPTX example)
class PptxRenderer implements SlideRenderer {
  async render(deck: Deck): Promise<ExportResult> {
    const pptx = new PptxGenJS();
    for (const slide of deck.slides) {
      const pptxSlide = pptx.addSlide();
      for (const element of slide.elements) {
        this.renderElement(pptxSlide, element, deck.theme);
      }
    }
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    const url = await uploadToS3(buffer, `${deck.id}.pptx`);
    return { format: 'pptx', url, size: buffer.length };
  }

  private renderElement(pptxSlide: any, element: SlideElement, theme: ThemeConfig) {
    switch (element.type) {
      case 'text':
        // Map role to PPTX placeholder or text box
        // Map percentage position to EMU units
        // Apply theme typography
        break;
      case 'image':
        // Download from S3, add as image with position
        break;
    }
  }
}
```

### Pattern 3: Design Token Validation

```typescript
// Data-driven constraint definitions
const colorConstraints = {
  rules: [
    {
      name: 'wcag-aa-contrast',
      check: (fg: string, bg: string) => getContrastRatio(fg, bg) >= 4.5,
      severity: 'error',
      message: 'Text color does not meet WCAG AA contrast ratio (4.5:1)',
    },
    {
      name: 'palette-membership',
      check: (color: string, palette: string[]) => palette.includes(color),
      severity: 'warning',
      message: 'Color is not in the selected theme palette',
    },
  ],
};

// Validator service
@Injectable()
export class DesignService {
  private validators: ConstraintValidator[];

  validate(slide: Slide, theme: ThemeConfig): ValidationResult {
    const violations: Violation[] = [];
    for (const validator of this.validators) {
      violations.push(...validator.check(slide, theme));
    }
    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
    };
  }
}
```

## Data Flow

### Primary Flow: Knowledge Base to Presentation

```
[User uploads docs]
    │
    ▼
[NestJS API] ──presigned URL──> [S3 Storage]
    │                                 │
    │ dispatch job                    │ download
    ▼                                 ▼
[doc-ingest queue] ──────────> [Python Worker]
                                      │
                              parse -> chunk -> embed
                                      │
                                      ▼
                              [Vector Store (pgvector)]


[User requests deck generation]
    │
    ▼
[NestJS API] ──dispatch──> [rag-query queue] ──> [Python RAG Worker]
    │                                                     │
    │                                              retrieve context
    │                                                     │
    │  <──── job result (structured context) ─────────────┘
    │
    ▼
[NestJS API: LLM call to generate slide content]
    │
    ├── validate against design constraints
    │
    ├── dispatch to [image-gen queue] for AI visuals
    │        │
    │        ▼
    │   [Python Worker -> Replicate API -> S3]
    │        │
    │   <────┘ (image URLs in job result)
    │
    ▼
[Persist Deck + Slides to PostgreSQL]
    │
    ▼
[User requests export in format X]
    │
    ▼
[NestJS API] ──dispatch──> [export queue] ──> [Node Export Worker]
                                                      │
                                              renderer adapter
                                              selects format
                                                      │
                                              ┌───────┼───────┐
                                              ▼       ▼       ▼
                                          [PPTX] [PDF]  [Reveal.js]
                                              │       │       │
                                              ▼       ▼       ▼
                                          [Upload to S3]
                                              │
                                              ▼
                                          [Return download URL]
```

### Key Data Flows

1. **Document Ingestion:** Client uploads via presigned URL to S3. NestJS dispatches parsing job to `doc-ingest` queue. Python worker downloads from S3, parses (PyMuPDF for PDF, python-docx for DOCX), chunks (recursive/semantic, 512 tokens, 10-20% overlap), generates embeddings (sentence-transformers or OpenAI), stores vectors in pgvector with metadata. Job completes, NestJS updates knowledge base status.

2. **Deck Generation:** NestJS dispatches RAG query to `rag-query` queue. Python performs hybrid retrieval (vector similarity + BM25 keyword). Returns top-K chunks with scores. NestJS feeds assembled context to LLM (OpenAI/Anthropic structured output) for slide content generation. Design constraint engine validates output. Slides persisted to PostgreSQL as canonical slide model.

3. **Image Generation:** For slides needing AI visuals, NestJS dispatches to `image-gen` queue with prompt and style parameters. Python worker calls Replicate API asynchronously (webhook mode preferred over polling). On completion, uploads result to S3, returns URL. NestJS updates slide's image reference. Credits deducted per image.

4. **Export:** NestJS dispatches export job with deck ID and format to `export` queue. Node export worker loads deck from PostgreSQL (direct DB read access to avoid serializing large decks through Redis). Routes to format-specific renderer. Renderer converts canonical slide model to target format. Uploads output to S3. Returns presigned download URL with expiry.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single NestJS instance, 1-2 Python workers per queue, single Redis, PostgreSQL with pgvector. Monorepo deployed as 4 processes (API + 3 worker types). |
| 1k-100k users | Horizontal scaling of Python workers (image-gen is the bottleneck -- Replicate latency). BullMQ rate limiting to manage API costs. Redis Sentinel for HA. Connection pooling (PgBouncer). CDN for exported assets. Consider Qdrant if pgvector query latency exceeds 100ms. |
| 100k+ users | Separate export worker pool per format. Dedicated Redis instances (queue vs cache). PostgreSQL read replicas. Shard vector store by user/org. Queue priority lanes (paid users get faster processing). Self-hosted embedding models (e5-large-v2) to cut costs. |

### Scaling Priorities

1. **First bottleneck: Image generation latency.** Replicate API calls take 5-30 seconds. With 100 concurrent deck generations requesting images, the image-gen queue backs up. Mitigation: increase worker concurrency, use Replicate webhooks (not polling), implement image caching for repeated/similar prompts, set BullMQ rate limiter to match Replicate plan limits.

2. **Second bottleneck: RAG query throughput.** Vector similarity search with re-ranking is CPU-intensive. Mitigation: cache frequent queries in Redis with TTL, pre-compute embeddings for common topics, use pgvector HNSW indexes (not IVFFlat) for sub-10ms approximate search at scale.

3. **Third bottleneck: Export rendering memory.** PptxGenJS and Marp CLI (which uses Puppeteer internally for PDF) are memory-intensive for large decks (50+ slides with images). Mitigation: stream images from S3 instead of buffering, run export worker with increased heap size (--max-old-space-size=4096), consider dedicated export instances.

## Anti-Patterns

### Anti-Pattern 1: Format-Specific Logic in the Slide Model

**What people do:** Add fields like `pptxFontSize`, `revealCssClass`, or `googleSlideObjectId` to the core slide data model.
**Why it breaks:** Every new export format requires model changes. The model becomes a union of all format quirks rather than a clean abstraction. Tests must account for every format's fields.
**Do this instead:** Keep the slide model format-agnostic. Each renderer maps abstract concepts (`role: 'title'`) to format-specific implementations. Use the optional `formatHints` extension for true edge cases.

### Anti-Pattern 2: Synchronous Replicate API Calls from the API Server

**What people do:** Call the Replicate API directly from a NestJS controller and await the result before responding to the client.
**Why it breaks:** Image generation takes 5-30 seconds per image. A 12-image deck blocks the request for 1-6 minutes. HTTP connections timeout, the NestJS event loop saturates, and the server cannot handle other requests.
**Do this instead:** Dispatch to BullMQ. Return a job ID immediately. Client polls for status or subscribes via WebSocket/SSE. Use Replicate webhooks instead of polling for completion.

### Anti-Pattern 3: Running RAG in Node.js to Avoid Cross-Language Complexity

**What people do:** Use LangChain.js or a minimal Node.js RAG implementation to keep everything in one language.
**Why it breaks:** Node.js RAG libraries have fewer parsing options (poor PDF table extraction, no OCR), fewer embedding model choices, and less community support for advanced retrieval patterns (hybrid search, re-ranking, query expansion). Retrieval quality directly determines presentation quality.
**Do this instead:** Accept the cross-language complexity. BullMQ handles it cleanly. Python gives access to unstructured.io, sentence-transformers, PyMuPDF, and the full LangChain/LlamaIndex ecosystem. The complexity cost is one-time (queue setup); the quality benefit is ongoing.

### Anti-Pattern 4: One Giant Worker Process

**What people do:** Run a single Python process that handles image generation, document ingestion, and RAG queries on the same queue.
**Why it breaks:** A slow image generation job blocks document ingestion. A burst of ingestion jobs starves RAG queries. Different workloads need different scaling profiles: image gen is I/O bound (external API calls), ingestion is CPU bound (parsing/embedding), RAG is memory bound (vector search).
**Do this instead:** Separate queues and separate worker processes per workload type. Scale each independently.

### Anti-Pattern 5: Design Constraints Applied After Generation

**What people do:** Generate slides first, then try to auto-fix design issues (bad contrast, wrong fonts, too dense).
**Why it breaks:** Post-hoc fixes are lossy. Auto-changing a color may break visual intent. Shrinking text to meet density rules may hide content. Users don't understand why their output looks different from what was generated.
**Do this instead:** Enforce constraints at two points: (1) feed design token definitions into the LLM prompt so generated content is constraint-aware from the start, (2) validate at the API boundary and return violations as actionable feedback to the user, not silent auto-corrections.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Replicate API | Async prediction via Python httpx + webhook callbacks | Use `webhook_events_filter: ["completed"]`. Verify webhook signatures. Budget ~$0.01-0.05/image. |
| OpenAI / Anthropic (LLM) | Direct API call from NestJS for slide content generation | Structured output mode for reliable JSON. Stream for real-time preview. |
| OpenAI Embeddings | Called from Python worker for document embedding | text-embedding-3-small at $0.02/1M tokens. Batch API for 50% cost reduction at scale. |
| Google Slides API | OAuth2 + batch update from Node export worker | Requires user OAuth consent. Batch updates are atomic. Template-based approach preferred. |
| S3-Compatible Storage | Presigned URLs for upload/download from NestJS | MinIO for dev, AWS S3 or Cloudflare R2 for prod. Lifecycle rules for temp exports. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| NestJS API <-> Python Workers | BullMQ queues (Redis) | Jobs carry JSON payloads. Workers return results via job completion. No direct HTTP calls. |
| NestJS API <-> Node Export Worker | BullMQ export queue | Export worker reads deck from PostgreSQL directly (shared read access) to avoid serializing large decks through Redis. |
| API <-> Client | REST + WebSocket/SSE | REST for CRUD. WebSocket or SSE for real-time job status (generation progress, image completion). |
| Slide Model <-> Renderers | TypeScript package import | `slide-model` package is a build-time dependency of both `api` and `export-worker`. |
| Design Tokens <-> Validators/Renderers | TypeScript package import | `design-tokens` package consumed by constraint validators (API) and renderers (export worker). |

## Build Order (Dependencies Between Components)

### Phase 1: Foundation (No Dependencies)

1. **Slide Data Model** (`packages/slide-model/`) -- Define core types, JSON schema. Everything depends on this.
2. **Design Tokens** (`packages/design-tokens/`) -- Color palettes, typography scales. Used by validators and renderers.
3. **Database Schema** (PostgreSQL + Prisma) -- Users, decks, slides, credits, jobs, document chunks.
4. **Redis + BullMQ Setup** -- Queue infrastructure, connection config.

### Phase 2: Core API (Depends on Phase 1)

5. **Auth Module** -- JWT, guards, user registration/login.
6. **Deck/Slide CRUD** -- Create, read, update, delete using the slide data model.
7. **Design Constraint Engine** -- Validate slides against design tokens. Build early because it validates all downstream output.
8. **S3 Storage Module** -- Presigned URL generation, file lifecycle management.
9. **Job Dispatch Module** -- BullMQ producers for all 4 queue types.

### Phase 3: Workers (Depends on Phase 1 + Phase 2 Queue Infra)

10. **Python Document Ingestion Worker** -- PDF/DOCX parsing, chunking, embedding. Needs BullMQ + S3.
11. **Python Image Generation Worker** -- Replicate API integration. Independent of doc ingestion.
12. **Python RAG Query Worker** -- Vector similarity search + context assembly. Requires vector store populated by ingestion worker (#10).

### Phase 4: Export (Depends on Phase 1 Slide Model + Phase 2 Storage)

13. **PPTX Renderer** -- PptxGenJS. Primary output format, build first.
14. **PDF Renderer** -- Marp CLI or Puppeteer HTML-to-PDF.
15. **Reveal.js Renderer** -- Static HTML generation with embedded assets.
16. **Google Slides Renderer** -- OAuth2 consent flow + Slides API batch updates. Build last (most complex external dependency).

### Phase 5: Integration and Polish

17. **Real-time Status** -- WebSocket/SSE for job progress notifications.
18. **Credit System** -- Reserve credits on dispatch, deduct on completion, refund on failure.
19. **Webhook Handler** -- Replicate completion callbacks that update slide image status.

**Build order rationale:**
- Slide data model first because it is the shared contract between API and all workers/renderers. Get it right before building anything that produces or consumes it.
- Design constraints before presentation engine so validation exists before any content is generated. Retrofitting constraints onto existing content is harder than designing constrained from the start.
- Document ingestion before RAG queries because the RAG worker needs a populated vector store.
- PPTX export before other formats because it covers the majority use case and validates the renderer adapter pattern.
- Google Slides last because it requires OAuth2 complexity and user consent flows that should not block the core product.
- Workers in Phase 3 can be built in parallel with each other (image gen and doc ingestion are independent).
- Export renderers in Phase 4 can also be built in parallel.

## Sources

- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics)
- [BullMQ Architecture](https://docs.bullmq.io/guide/architecture)
- [BullMQ Python Introduction](https://docs.bullmq.io/python/introduction)
- [BullMQ NestJS Integration](https://docs.bullmq.io/guide/nestjs)
- [BullMQ Workers Documentation](https://docs.bullmq.io/guide/workers)
- [PptxGenJS Documentation](https://gitbrent.github.io/PptxGenJS/)
- [python-pptx Documentation](https://python-pptx.readthedocs.io/)
- [Reveal.js Framework](https://revealjs.com/)
- [Google Slides API - Create Presentations](https://developers.google.com/workspace/slides/api/guides/presentations)
- [Replicate HTTP API Reference](https://replicate.com/docs/reference/http)
- [Marp Presentation Ecosystem](https://marp.app/)
- [Constraint-Based Design Systems (Normal Flow)](https://normalflow.pub/posts/2022-08-12-an-introduction-to-constraint-based-design-systems)
- [Design Tokens Beyond Colors (Bumble Tech)](https://medium.com/bumble-tech/design-tokens-beyond-colors-typography-and-spacing-ad7c98f4f228)
- [RAG Chunking Strategies (Weaviate)](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Async AI Processing Architecture (GitHub Gist)](https://gist.github.com/horushe93/cc814ec8cc03e6e5f5f82b601423893b)
- [NestJS Queues Documentation](https://docs.nestjs.com/techniques/queues)
- [NestJS-Python-Kafka Microservices (GitHub)](https://github.com/gispada/nestjs-python-kafka-microservices)

---
*Architecture research for: AI Presentation SaaS (SlideForge)*
*Researched: 2026-02-14*
