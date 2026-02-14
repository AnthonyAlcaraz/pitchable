# Stack Research

**Project:** SlideForge - AI Presentation Generation SaaS
**Researched:** 2026-02-14 (v2 - full polyglot stack with Python workers)
**Overall Confidence:** HIGH (versions verified via npm/PyPI registries, Feb 2026)

---

## Recommended Stack

### Core Backend (NestJS API)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NestJS | 11.x (11.1.13) | Backend framework | Pre-decided. 60k+ GitHub stars. Modular DI architecture maps to SlideForge's module boundaries (auth, billing, generation, storage, knowledge-base). TypeScript-native. | HIGH |
| Node.js | 22.x LTS | Runtime | Active LTS through Oct 2027. NestJS 11 requires Node 20+. Node 22 provides stable ESM support and performance improvements. | HIGH |
| TypeScript | 5.7.x | Type safety | NestJS 11 requires TS 5.5+. Version 5.7 adds isolated declarations and improved inference. | HIGH |

**Why NestJS over alternatives:**
- Express alone lacks structure for a multi-module SaaS (auth + billing + generation + storage + queues + knowledge-base).
- Fastify is faster raw but NestJS sits on top of it (`@nestjs/platform-fastify`). Use Fastify adapter for performance without losing NestJS DX.
- Hono/Elysia are too lightweight for queue management, guard-based auth, and modular architecture needs.

### Database & Cache

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16.x | Primary database | Pre-decided. Stores users, presentations, credits, job metadata. JSONB for flexible presentation config. pgvector extension keeps embeddings co-located with relational data. | HIGH |
| pgvector | 0.8.1 | Vector similarity search | Store and query document embeddings directly in PostgreSQL. Cosine, L2, inner product distance. IVFFlat and HNSW indexes. Supported by Supabase, Neon, Azure, GCP. Avoids a separate vector database service. | HIGH |
| Redis | 7.x | Cache + BullMQ backend | Pre-decided. Required by BullMQ for job queue persistence. Also used for session cache, rate limiting, and presentation generation progress tracking. | HIGH |
| Prisma ORM | 7.x (7.2.0) | Database ORM | Prisma 7 removed the Rust engine (pure JS), faster cold starts. Schema-first approach with superior type safety. 2x npm downloads vs TypeORM. pgvector access via raw queries ($queryRaw) or prisma-extension-pgvector. Best DX for SaaS greenfield. | HIGH |

**ORM Decision Rationale:**

| Criterion | Prisma 7 | Drizzle | TypeORM |
|-----------|----------|---------|---------|
| Type safety | Full (generated client) | Full (schema IS TypeScript) | Partial (decorators lose types) |
| NestJS integration | Mature community patterns | Community module (@knaadh/nestjs-drizzle) | Official (@nestjs/typeorm) |
| Migration DX | `prisma migrate` + Prisma Studio | drizzle-kit push/generate | CLI migrations |
| pgvector support | Raw queries + community extension | Raw SQL | Raw queries |
| Ecosystem | Studio, seeders, Migrate, Pulse | Lighter tooling | Mature but stagnant |
| Bundle size | Lighter in v7 (no Rust engine) | Tiny (~30KB) | Moderate |
| Adoption trend | 2x TypeORM downloads, growing | Growing fast but smaller | Declining |

**Recommendation:** Use Prisma 7 for the relational data layer. The schema-first approach catches errors at compile time, Prisma Studio accelerates development, and the ecosystem is mature for SaaS patterns. Use `$queryRaw` or prisma-extension-pgvector for vector operations against pgvector. If the team has strong SQL preferences and wants zero ORM abstraction, Drizzle is the alternative.

**pgvector Schema Pattern:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id),
  content TEXT NOT NULL,
  embedding vector(3072),  -- OpenAI text-embedding-3-large dimension
  metadata JSONB,
  source_file TEXT,
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Scale trigger:** If a single knowledge base exceeds 1M chunks or query latency exceeds 200ms at p99, evaluate pgvectorscale (Timescale) or dedicated Qdrant.

### Job Queue

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| BullMQ | 5.69.x | Async job processing | Pre-decided. Redis-backed, supports cross-language workers (Node.js + Python). Rate limiting, retries, scheduling, concurrency control. | HIGH |
| @nestjs/bullmq | 11.0.4 | NestJS integration | Official NestJS module. Queue processors, events, job scheduling via decorators. | HIGH |
| BullMQ Python | 2.x | Python job consumers | Official Python SDK. Python workers consume jobs from the same Redis queues that NestJS enqueues to. First-class cross-language support. | HIGH |

**Queue Architecture (4 named queues):**
1. `document-parse` - Extract text from uploaded PDFs/DOCX/MD/URLs (Python worker)
2. `embedding-generate` - Compute vector embeddings for document chunks (Python worker)
3. `image-generate` - Call Replicate API for slide images (Python worker)
4. `presentation-compile` - Assemble final PPTX/HTML/PDF output (Node.js worker)

**Cross-Language Communication Pattern:**
```
Client --> NestJS API --> BullMQ Queue (Redis) --> Python Worker
                |                                      |
                |                                      v
                +--- PostgreSQL <--- Worker writes embeddings/results back
```

NestJS enqueues jobs with JSON payloads. Python workers consume from the same Redis queues via `bullmq` Python package. Results written to PostgreSQL or S3. NestJS polls job status or uses BullMQ events for completion notifications.

**Why BullMQ over alternatives:**
- Agenda.js: MongoDB-based, adds unnecessary DB dependency.
- Bee-Queue: Abandoned (last commit 2021).
- RabbitMQ: Heavier to operate, requires separate broker. BullMQ reuses Redis.
- Temporal.io: Powerful orchestration but massive operational overhead for a startup.
- gRPC between NestJS and Python: Tight coupling, proto file management. BullMQ is async-first and handles "fire job, get result later" naturally.
- HTTP from NestJS to FastAPI: Couples API to worker availability, loses retry/scheduling. Use BullMQ for dispatch; reserve FastAPI for health checks only.

### Python Worker Stack

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| FastAPI | 0.115.x | Worker HTTP API | Async, Pydantic validation, type-safe. Health check endpoint and direct invocation for debugging. Primary dispatch is via BullMQ, not HTTP. | HIGH |
| uvicorn | 0.34.x | ASGI server | Production server for FastAPI. Use with `--workers` for multi-process. | HIGH |
| bullmq (Python) | 2.x | Job consumption | BullMQ's official Python SDK. Consume jobs from same Redis queues NestJS enqueues to. | HIGH |
| Pydantic | 2.x | Data validation | Settings management, job payload validation. FastAPI uses it natively. | HIGH |
| replicate (Python) | 1.x | Image generation | Official Python SDK for Replicate API. Workers call for Nano Banana Pro / FLUX image generation. | HIGH |
| pymupdf4llm | 0.3.3 | PDF text extraction | Converts PDF to Markdown optimized for LLM/RAG. Best speed/quality balance. Released Feb 13, 2026. | HIGH |
| python-docx | 1.1.x | DOCX parsing | Standard library for reading Word documents. Extract text, tables, paragraphs. | HIGH |
| trafilatura | 2.0.x | URL/HTML extraction | Extract main text from web pages. Used by HuggingFace, IBM, Microsoft Research. Outputs Markdown, JSON, XML, TXT. | HIGH |
| mistune | 3.x | Markdown parsing | Zero-dependency Python Markdown parser. Parse .md files into structured text for chunking. | MEDIUM |
| langchain-text-splitters | 0.3.x | Text chunking | RecursiveCharacterTextSplitter for document chunking. 256-512 token chunks with 10-20% overlap. | HIGH |
| openai (Python SDK) | 1.x | Embeddings API | OpenAI text-embedding-3-large (3072-dim, 8191 tokens). Or use Cohere embed-v4 (65.2 MTEB score) if multilingual matters. | HIGH |
| psycopg | 3.x | PostgreSQL driver | Direct SQL for writing embeddings to pgvector. psycopg[binary] for easier install. | HIGH |
| pgvector (Python) | 0.3.x | Vector operations | Python client for pgvector. Register vector type with psycopg for native array handling. | HIGH |
| Python | 3.12.x | Runtime | Best performance (faster interpreter). FastAPI and BullMQ Python require 3.8+. | HIGH |

**Document Ingestion Pipeline (Python workers):**
```
Upload → Detect MIME type → Route to parser:
  .pdf  → pymupdf4llm → Markdown text + metadata
  .docx → python-docx → plain text + structure
  .md   → mistune → structured text
  URL   → trafilatura → main content as Markdown

→ langchain-text-splitters (RecursiveCharacterTextSplitter)
  → chunks (256-512 tokens, 10-20% overlap)

→ OpenAI text-embedding-3-large (batch embed)
  → vector embeddings (3072 dimensions)

→ psycopg + pgvector → store in document_chunks table
```

**Embedding Model Choice:**

| Model | MTEB Score | Dimensions | Max Tokens | Cost/1M tokens | Best For |
|-------|-----------|------------|------------|----------------|----------|
| OpenAI text-embedding-3-large | 64.6 | 3072 | 8191 | $0.13 | Best quality, production default |
| OpenAI text-embedding-3-small | 62.3 | 1536 | 8191 | $0.02 | Budget/MVP |
| Cohere embed-v4 | 65.2 | 1024 | 512 | $0.10 | Multilingual, slightly better MTEB |
| BGE-M3 (self-hosted) | 63.0 | 1024 | 8192 | GPU cost only | Self-hosted, no API fees |

**Recommendation:** Start with OpenAI text-embedding-3-small for MVP (cheapest, good quality). Upgrade to text-embedding-3-large or Cohere embed-v4 when retrieval quality matters. Switch to self-hosted BGE-M3 when volume makes API costs unfavorable.

### File Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @aws-sdk/client-s3 | 3.x | S3-compatible storage | Cloud-agnostic via S3 protocol. Works with AWS S3, MinIO (local), Cloudflare R2, Backblaze B2. | HIGH |
| @aws-sdk/s3-request-presigner | 3.x | Presigned upload URLs | Client uploads documents directly to S3 via presigned URL. Reduces server load, handles large files. | HIGH |
| MinIO | Latest | Local dev S3 | Docker-based S3-compatible storage for local development. Identical API to production S3. | HIGH |

**Storage Architecture:**
```
Buckets:
  uploads/        - Raw user uploads (PDF, DOCX, MD)
  parsed/         - Extracted text chunks (JSON)
  images/         - AI-generated slide images
  presentations/  - Final output files (PPTX, HTML, PDF)
```

**File Upload Pattern:**
1. Client requests presigned upload URL from NestJS API
2. NestJS generates presigned URL via @aws-sdk/s3-request-presigner (5-min expiry)
3. Client uploads file directly to S3 (bypasses API server entirely)
4. Client confirms upload to API
5. API enqueues `document-parse` job with S3 key

**Why presigned URLs over Multer:**
- Multer buffers entire file in server memory. Breaks on files > 100MB.
- Presigned URLs offload bandwidth and storage to S3 directly.
- Reduces API server CPU/memory usage.
- Use Multer only for tiny uploads (avatars, thumbnails).

### Presentation Export Pipeline

**CRITICAL FINDING:** Marp CLI's PPTX output renders slides as background images, making them non-editable in PowerPoint. The `--pptx-editable` flag is experimental, requires LibreOffice installed, and produces lower quality output.

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PptxGenJS | 4.0.1 | PPTX generation (PRIMARY) | Programmatic, fully editable PPTX creation. Text, images, shapes, charts, tables, slide masters. OOXML-compliant. Pure JavaScript, no system dependencies. | HIGH |
| Puppeteer | 24.x | HTML to PDF export | Headless Chrome renders HTML slides to pixel-perfect PDF. Handles JS execution, web fonts, CSS layouts. Standard approach for HTML-to-PDF. | HIGH |
| reveal.js | 5.2.1 | HTML presentation export | The HTML presentation framework. Markdown support, auto-animate, speaker notes, LaTeX. Export as self-contained HTML. Use for web preview and HTML download. | HIGH |
| googleapis | 144.x | Google Slides API | Official Google client. Create presentations via Slides API v1 with batchUpdate. Requires OAuth 2.0 (Google Cloud project). Defer to post-MVP. | MEDIUM |

**Export Strategy:**

| Output Format | Technology | Editability | Priority |
|---------------|-----------|-------------|----------|
| PPTX (download) | PptxGenJS | Fully editable | MVP - Primary output |
| PDF (download) | Puppeteer (render reveal.js to PDF) | View-only | MVP - Secondary output |
| HTML (web view) | reveal.js | Interactive in browser | MVP - Preview |
| Google Slides | Google Slides API | Fully editable in Google | Post-MVP |

**Why PptxGenJS over Marp for PPTX:**
- Marp PPTX output is pre-rendered images (non-editable text, non-movable elements).
- `--pptx-editable` requires LibreOffice on the server (heavyweight dependency).
- Users paying for a SaaS expect editable slides they can customize in PowerPoint/Keynote.
- PptxGenJS gives full programmatic control: text boxes, images, shapes, precise positioning for the design constraint engine.

### Image Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| replicate (Python) | 1.x | Replicate API client | Pre-decided. Official Python SDK. Called from Python workers. | HIGH |
| FLUX.1 [schnell] | Latest on Replicate | Fast image generation | $0.003/image. Apache 2.0 license (unrestricted commercial). 1-4 step inference (fastest FLUX variant). | HIGH |
| sharp | 0.34.x | Image post-processing | Resize generated images to slide dimensions. Convert formats (WebP to PNG for PPTX compatibility). Node.js side for final assembly. | HIGH |

**Image Generation Cost Model:**
```
FLUX.1 [schnell]: $0.003/image
Average deck: 10 slides, 5 custom images → $0.015/deck
With overhead (retries, variants): ~$0.02/deck
Margin at $1/deck credit: 98% gross margin on image generation
```

**Model Fallback Ladder:**

| Model | Cost/Image | Speed | Quality | License |
|-------|-----------|-------|---------|---------|
| FLUX.1 [schnell] | $0.003 | Fastest | Good | Apache 2.0 (free) |
| FLUX.1 [dev] | $0.030 | Medium | Better | Non-commercial |
| FLUX.1 [pro] | $0.055 | Slower | Best | Paid license |
| SDXL | ~$0.005 | Fast | Good for stylized | Open |

**Recommendation:** Start with FLUX.1 [schnell] for MVP. Upgrade to FLUX.1 [pro] for a premium tier later.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @nestjs/passport | 11.x | Auth framework | Official NestJS integration. Strategy-based (JWT now, OAuth later). Guards-based route protection. | HIGH |
| passport-jwt | 4.0.x | JWT strategy | Standard JWT validation strategy for Passport. | HIGH |
| @nestjs/jwt | 11.x | JWT token operations | Sign/verify tokens. Access + refresh token pattern. | HIGH |
| bcrypt | 5.x | Password hashing | Battle-tested, adaptive cost factor. Use bcryptjs (pure JS) if native compilation causes issues. | HIGH |
| helmet | 8.x | HTTP security headers | Content-Security-Policy, X-Frame-Options, etc. One-line middleware. | HIGH |

**Auth Architecture:**
```
Phase 1 (MVP): Email/password + JWT (access + refresh tokens)
Phase 2: Google OAuth + GitHub OAuth via passport strategies
Phase 3: SAML/SSO for enterprise customers
```

**Token Strategy:**
- Access token: 15 min expiry, stored in memory (not localStorage).
- Refresh token: 7 day expiry, httpOnly cookie.
- Hashed refresh token stored in user table for revocation.

### Billing & Payments

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| stripe | 20.3.1 | Payment processing | Industry standard. New Billing Meters API (replaces legacy usage records, deprecated 2025-03-31). Credit-based pricing has first-class support. | HIGH |
| @stripe/stripe-js | 5.x | Frontend Stripe | Stripe Elements for checkout UI, payment method collection. | HIGH |

**CRITICAL: Use Billing Meters API, NOT legacy usage records.**
Legacy usage records API removed in Stripe API version `2025-03-31.basil`. New projects MUST use the Billing Meters API:
- Create a `Meter` for image generation credits
- Send `MeterEvent` for each credit consumed
- Attach meters to prices for automatic billing
- [Stripe credit-based pricing docs](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)

**Credit System Architecture:**
```
Purchase: User buys credit pack → Stripe Checkout → webhook → add credits to DB
Consume:  User generates deck → deduct credits in PostgreSQL → send MeterEvent to Stripe
Track:    Stripe meter aggregates usage per billing period
Refund:   Failed generations → credits returned to DB balance
```

**Why dual tracking (PostgreSQL + Stripe Meters):**
- PostgreSQL for real-time "can this user generate?" checks (low latency)
- Stripe Meters for billing accuracy and invoice generation (eventual consistency is fine for billing)

### Validation & Configuration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| class-validator | 0.14.x | DTO validation | Decorator-based validation on DTOs. NestJS ValidationPipe integration. whitelist + forbidNonWhitelisted strips unknown fields. | HIGH |
| class-transformer | 0.5.x | DTO transformation | Transforms plain JSON to class instances. Works with ValidationPipe for automatic type coercion. | HIGH |
| @nestjs/config | 4.x | Environment config | Wraps dotenv with validation, typed config modules, namespace support. | HIGH |
| @nestjs/swagger | 8.x | API documentation | Auto-generate OpenAPI spec from decorators. Essential for frontend integration. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| rate-limiter-flexible | 5.x | Rate limiting | Redis-backed. Protect image generation endpoint from abuse. | MEDIUM |
| winston | 3.x | Structured logging | JSON logs for production. Request tracing with correlation IDs. | HIGH |
| uuid | 11.x | Unique IDs | Presentation IDs, job IDs. Use UUIDv7 for time-sortable IDs. | HIGH |
| ioredis | 5.x | Redis client | Required by BullMQ. Also used for direct Redis cache operations. | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Docker + Docker Compose | Local dev environment | PostgreSQL + Redis + MinIO + API + Workers in one `docker-compose.yml`. Essential for polyglot (TS + Python) local dev. |
| Prisma Studio | Database GUI | Ships with Prisma CLI. Visual data browsing during development. Free. |
| Bull Board (@bull-board/nestjs) | Job queue dashboard | Web UI for monitoring BullMQ queues, jobs, failures. Mount at `/admin/queues`. |
| Vitest | Unit/integration testing (Node.js) | Faster than Jest, native ESM support. NestJS 11 still ships Jest by default; Vitest adoption is growing. |
| @nestjs/testing | NestJS test utilities | Official testing module for unit/e2e tests. |
| ESLint 9 + Prettier 3 | Code quality (Node.js) | Flat config (ESLint 9). TypeScript-aware rules. |
| Ruff | Python linting + formatting | Replaces Black + isort + Flake8. Single tool, extremely fast. |
| pytest + pytest-asyncio | Python testing | Standard Python test runner. pytest-asyncio for async worker tests. |
| GitHub Actions | CI/CD | Lint, test, build, deploy. Matrix strategy for Node + Python. |

---

## Installation

### Node.js (NestJS API)

```bash
# Core framework
npm install @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata

# Database
npm install prisma @prisma/client
npm install pgvector  # pgvector client for raw queries if needed

# Authentication
npm install @nestjs/passport passport passport-jwt @nestjs/jwt
npm install bcrypt helmet
npm install -D @types/passport-jwt @types/bcrypt

# Validation & Config
npm install class-validator class-transformer @nestjs/config @nestjs/swagger

# Queue
npm install @nestjs/bullmq bullmq ioredis

# Export pipeline
npm install pptxgenjs puppeteer reveal.js googleapis

# Image post-processing
npm install sharp

# Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Billing
npm install stripe

# Replicate (for job enqueueing from API if needed)
npm install replicate

# Utilities
npm install rate-limiter-flexible winston uuid

# Dev dependencies
npm install -D typescript @nestjs/cli @nestjs/testing @types/node
npm install -D prisma  # Prisma CLI (also a devDep)
npm install -D vitest @vitest/coverage-v8
npm install -D eslint prettier tsx
npm install -D @bull-board/nestjs @bull-board/api @bull-board/express
```

### Python (Workers)

```bash
# Core
pip install fastapi uvicorn[standard] pydantic pydantic-settings

# Job queue
pip install bullmq

# Image generation
pip install replicate

# Document processing
pip install pymupdf4llm python-docx trafilatura mistune

# Text splitting & embeddings
pip install langchain-text-splitters openai  # or: pip install cohere

# Database (for storing embeddings)
pip install "psycopg[binary]" pgvector

# Dev
pip install pytest pytest-asyncio ruff httpx  # httpx for FastAPI test client
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not the Alternative |
|----------|-------------|-------------|------------------------|
| ORM | Prisma 7 | Drizzle ORM | Drizzle is lighter and SQL-first, better for edge/serverless. But Prisma's ecosystem (Studio, Migrate, seeders) and community patterns for NestJS are more mature. Drizzle NestJS integration relies on community module. |
| ORM | Prisma 7 | TypeORM | Decorator-heavy, weaker type inference, declining adoption. Critical bugs sit months unresolved. |
| Vector DB | pgvector (in PostgreSQL) | Pinecone / Weaviate | Separate vector DB adds cost, latency, operational complexity. SlideForge's vectors are scoped per-user (small collections). pgvector keeps embeddings co-located with relational data. |
| Vector DB | pgvector | Qdrant | Qdrant is faster for pure vector workloads at massive scale. Not needed until millions of vectors per knowledge base. |
| Vector DB | pgvector | ChromaDB | Great for prototyping but lacks production features (no RBAC, SQLite backend is single-node). |
| Queue | BullMQ | RabbitMQ | Heavier to operate, requires separate broker. BullMQ reuses existing Redis. |
| Queue | BullMQ | Temporal | Powerful orchestration but massive operational overhead for a startup. |
| NestJS-Python comm | BullMQ queues | gRPC | Adds proto file management, code generation, tight coupling. BullMQ is async-first. |
| NestJS-Python comm | BullMQ queues | HTTP (NestJS calls FastAPI) | Couples API to worker availability. Loses retry/scheduling semantics. |
| PPTX generation | PptxGenJS | Marp CLI | Marp PPTX output is pre-rendered images (non-editable). `--pptx-editable` requires LibreOffice on server. |
| PPTX generation | PptxGenJS | python-pptx | Requires routing through Python worker for a rendering task. PptxGenJS is native Node.js. |
| PDF generation | Puppeteer | wkhtmltopdf | Abandoned QtWebKit engine. Cannot render modern CSS. |
| PDF generation | Puppeteer | Playwright | Both work. Puppeteer is lighter for single-browser (Chrome only) PDF generation. |
| PDF parsing | pymupdf4llm | Unstructured | Unstructured has better semantic chunks but is heavier (many deps, optional Docker). pymupdf4llm is faster, lighter, outputs clean Markdown. Start here; add Unstructured later if needed. |
| Embeddings | OpenAI text-embedding-3 | Self-hosted BGE-M3 | Self-hosting saves per-token cost but requires GPU infrastructure. Use API at early stage. |
| Auth | Passport + JWT | Auth0 / Clerk | Third-party auth adds cost ($0.05-0.25/MAU) and vendor lock-in. Passport + JWT is free and well-documented for NestJS. Consider Clerk if social login + MFA needed immediately. |
| Billing | Stripe Billing Meters | Custom billing | Building custom credit tracking/billing is months of work. Stripe handles invoicing, failed payments, tax. Worth the 2.9% + $0.30 fee. |
| URL extraction | trafilatura | BeautifulSoup + requests | BeautifulSoup requires manual boilerplate for encoding detection, boilerplate removal. Trafilatura handles all this in one call. |
| Python framework | FastAPI | Flask | FastAPI is async-native, has Pydantic built in, generates OpenAPI automatically. Flask requires extensions for everything. |
| Python linting | Ruff | Black + isort + Flake8 | Ruff replaces all three in a single, much faster tool. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Bull (legacy npm package) | Predecessor to BullMQ. No longer developed. Missing rate limiting, flow jobs, sandboxed processors. | BullMQ 5.x |
| Stripe Usage Records API | Deprecated in API version 2025-03-31. Removed entirely. | Stripe Billing Meters API |
| Sequelize | Predates modern TypeScript patterns. Weak typing, verbose. Community moved on. | Prisma 7 |
| wkhtmltopdf | Abandoned QtWebKit engine. Cannot render modern CSS (Grid, Flexbox). Known rendering bugs. | Puppeteer |
| Multer for large file uploads | Buffers entire file in server memory. Breaks on files > 100MB. | S3 presigned URLs (client uploads directly to S3) |
| Separate vector DB at launch | Adds operational cost, another service, network latency for joins. Not needed until millions of vectors. | pgvector in PostgreSQL |
| ChromaDB in production | No RBAC, SQLite backend is single-node. Great for prototyping only. | pgvector in PostgreSQL |
| LangChain full framework | Heavy dependency, frequent breaking changes, abstraction leaks. | langchain-text-splitters only (the useful part) + direct API calls |
| python-pptx for PPTX generation | Requires Python worker for rendering task. Cross-language call adds latency. | PptxGenJS (Node.js, same process as API) |
| nodemailer without a service | Raw SMTP is unreliable for transactional email. | Resend, Postmark, or AWS SES |
| Marp CLI for PPTX export | PPTX slides are background images, non-editable. | PptxGenJS for editable PPTX |

---

## Stack Patterns by Variant

**If you need real-time collaboration (Google Docs-style):**
- Add Yjs or Automerge for CRDT-based real-time sync
- Add WebSocket gateway via @nestjs/websockets
- Phase 3+ complexity; do not build at launch

**If you need very large knowledge bases (10k+ documents per user):**
- Add pgvectorscale (Timescale's extension) for faster ANN search
- Partition the document_chunks table by knowledge_base_id
- Monitor query latency; switch to Qdrant if pgvector becomes bottleneck

**If you need offline/self-hosted deployment:**
- Replace Replicate with self-hosted FLUX via ComfyUI + GPU server
- Replace OpenAI embeddings with BGE-M3 on local GPU
- Replace S3 with MinIO for S3-compatible local storage

**If you want edge/serverless deployment:**
- Replace Prisma with Drizzle ORM (7kb bundle, no binary)
- Replace BullMQ with Upstash QStash for serverless-compatible queuing
- Replace Puppeteer with Cloudflare Browser Rendering API

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| NestJS 11.x | Prisma 7.x | Prisma 7 dropped Rust engine; works natively with Node.js 20+. NestJS 11 requires Node 20+. |
| NestJS 11.x | Node.js 22 LTS | Required minimum is Node 20. Node 22 is current LTS (Active until Oct 2027). |
| @nestjs/bullmq 11.0.x | bullmq 5.x | Must match NestJS major version. @nestjs/bullmq 11 requires NestJS 11. |
| Prisma 7.x | pgvector 0.8.x | Use raw queries ($queryRaw) or prisma-extension-pgvector. Native vector type is on Prisma's 2026 roadmap but not shipped yet. |
| BullMQ Node 5.x | BullMQ Python 2.x | Cross-language queue sharing works because both use same Redis data structures. Pin Redis 7.x. |
| PptxGenJS 4.x | Node 18+ | ESM and CommonJS both supported. |
| Puppeteer 24.x | Chrome 133+ | Puppeteer downloads its own Chromium. For Docker, use `puppeteer` (not `puppeteer-core`) for auto-download. |
| stripe 20.x | Stripe API 2025-03-31+ | Uses Billing Meters (new). Do NOT use legacy usage-records API. |
| Python 3.12.x | FastAPI 0.115.x | FastAPI requires Python 3.8+. Use 3.12 for best performance. |
| pymupdf4llm 0.3.x | PyMuPDF 1.25.x | pymupdf4llm depends on PyMuPDF. Install pymupdf4llm and it pulls correct PyMuPDF version. |

---

## Version Pinning Strategy

**Node.js (package.json):** Pin major versions with `^` (caret) for patch/minor updates:
```json
{
  "@nestjs/core": "^11.0.0",
  "@prisma/client": "^7.0.0",
  "bullmq": "^5.69.0",
  "pptxgenjs": "^4.0.0",
  "stripe": "^20.3.0",
  "replicate": "^1.4.0",
  "reveal.js": "^5.2.0"
}
```
Lock exact versions with `npm ci` in CI/CD (uses package-lock.json).

**Python (requirements.txt or pyproject.toml):** Pin with `~=` for compatible releases:
```
fastapi~=0.115.0
bullmq~=2.0
replicate~=1.0
pymupdf4llm~=0.3.3
python-docx~=1.1.0
trafilatura~=2.0.0
langchain-text-splitters~=0.3.0
openai~=1.0
psycopg[binary]~=3.2
pgvector~=0.3.0
pydantic~=2.0
```

---

## Docker Compose Local Development

```yaml
services:
  api:           # NestJS API (Node.js 22)
  worker:        # Python workers (Python 3.12 + BullMQ)
  postgres:      # PostgreSQL 16 + pgvector extension
  redis:         # Redis 7 (BullMQ + cache)
  minio:         # S3-compatible local storage
```

**Cloud Deployment Options:**
- **AWS:** ECS/Fargate + RDS (PostgreSQL + pgvector) + ElastiCache + S3
- **GCP:** Cloud Run + Cloud SQL + Memorystore + GCS
- **Railway/Render:** Simplest for MVP (managed PostgreSQL + Redis included)
- **Self-hosted:** Docker Compose on VPS (Hetzner, DigitalOcean)

**Recommendation:** Start on Railway or Render for MVP speed. Migrate to AWS/GCP when scaling demands it.

---

## Sources

### Verified via npm/PyPI registries (HIGH confidence)
- [NestJS @nestjs/core 11.1.13](https://www.npmjs.com/package/@nestjs/core) - verified Feb 2026
- [Prisma 7.2.0](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) - released Dec 17, 2025
- [BullMQ 5.69.1](https://www.npmjs.com/package/bullmq) - verified Feb 2026
- [@nestjs/bullmq 11.0.4](https://www.npmjs.com/package/@nestjs/bullmq) - verified Feb 2026
- [PptxGenJS 4.0.1](https://www.npmjs.com/package/pptxgenjs) - verified Feb 2026
- [reveal.js 5.2.1](https://www.npmjs.com/package/reveal.js) - published ~Apr 2025
- [stripe 20.3.1](https://www.npmjs.com/package/stripe) - verified Feb 2026
- [replicate (Node) 1.4.0](https://www.npmjs.com/package/replicate) - verified Feb 2026
- [pymupdf4llm 0.3.3](https://pypi.org/project/pymupdf4llm/) - released Feb 13, 2026
- [pgvector 0.8.1](https://github.com/pgvector/pgvector) - verified Feb 2026

### Verified via official documentation (HIGH confidence)
- [Stripe Billing Meters](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide) - legacy deprecated 2025-03-31
- [Stripe Credit-Based Pricing](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication) - Passport + JWT
- [NestJS Queues](https://docs.nestjs.com/techniques/queues) - BullMQ integration
- [NestJS Validation](https://docs.nestjs.com/techniques/validation) - class-validator + class-transformer
- [Google Slides API Node.js Quickstart](https://developers.google.com/workspace/slides/api/quickstart/nodejs) - updated Dec 2025
- [BullMQ Cross-Language Support](https://bullmq.io/) - Python, Elixir, PHP
- [BullMQ NestJS Guide](https://docs.bullmq.io/guide/nestjs) - official integration docs
- [Prisma pgvector](https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres) - pgvector for Prisma Postgres
- [Replicate Node.js Getting Started](https://replicate.com/docs/get-started/nodejs)
- [Trafilatura 2.0 Documentation](https://trafilatura.readthedocs.io/)
- [PptxGenJS Documentation](https://gitbrent.github.io/PptxGenJS/)

### Verified via multiple credible sources (MEDIUM confidence)
- [Prisma vs TypeORM 2026](https://medium.com/@Nexumo_/prisma-or-typeorm-in-2026-the-nestjs-data-layer-call-ae47b5cfdd73) - Prisma recommended for SaaS greenfield
- [Prisma vs Drizzle 2026](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) - Drizzle lighter but less ecosystem
- [Embedding model comparison](https://research.aimultiple.com/embedding-models/) - Cohere embed-v4 (65.2 MTEB), OpenAI (64.6)
- [Document parsing comparison 2025](https://onlyoneaman.medium.com/i-tested-7-python-pdf-extractors-so-you-dont-have-to-2025-edition-c88013922257) - pymupdf4llm recommended
- [Chunking strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025) - RecursiveCharacterTextSplitter as default
- [S3 Presigned URLs NestJS](https://sandipwrites.medium.com/implementing-secure-aws-s3-file-uploads-in-nestjs-with-presigned-urls-573dfefe8f65) - recommended upload pattern

---
*Stack research for: SlideForge AI Presentation SaaS*
*Researched: 2026-02-14 (v2)*
