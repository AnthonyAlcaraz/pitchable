# Technology Stack

**Project:** SlideForge - AI Presentation Generation SaaS
**Researched:** 2026-02-14
**Overall Confidence:** HIGH (versions verified via npm/official sources)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NestJS | 11.x (11.1.13) | Backend framework | Pre-decided. Validated: NestJS 11 released Jan 2025, actively maintained, Series A funding guarantees support through 2030. Decorator-based architecture maps cleanly to this project's module boundaries (auth, billing, generation, storage). TypeScript-native. | HIGH |
| Node.js | 22.x LTS | Runtime | LTS through April 2027. Required by pdf-parse (>=22.3.0) and sharp (>=20.3.0). Node 22 gives stable ES module support and built-in test runner. | HIGH |
| TypeScript | 5.7.x | Type safety | NestJS 11 requires TS 5.5+. Version 5.7 adds isolated declarations and improved inference. | HIGH |

**Why NestJS over alternatives:**
- Express alone lacks structure for a multi-module SaaS (auth + billing + generation + storage + queues).
- Fastify is faster raw but NestJS sits on top of it anyway (`@nestjs/platform-fastify`). Use Fastify adapter for performance without losing NestJS DX.
- Hono/Elysia are too lightweight for this project's queue management, guard-based auth, and modular architecture needs.

### Database & Cache

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16.x | Primary database | Pre-decided. Stores users, presentations, credits, job metadata. JSONB for flexible presentation config. Row-level security for future multi-tenancy. | HIGH |
| Redis | 7.x | Cache + BullMQ backend | Pre-decided. Required by BullMQ for job queue persistence. Also used for session cache, rate limiting, and presentation generation progress tracking. | HIGH |
| Drizzle ORM | 0.45.x | Database ORM | Recommended over TypeORM and Prisma. 14x lower latency than Prisma on complex queries. No proprietary DSL (unlike Prisma's .prisma files). Schema defined in TypeScript. Zero cold-start overhead. SQL-first means no ORM abstraction leaks. | MEDIUM |

**ORM Decision Rationale:**

| Criterion | Drizzle | Prisma | TypeORM |
|-----------|---------|--------|---------|
| Performance | Fastest (compiles to SQL) | Slow on joins (N+1) | Moderate |
| Type safety | Full (schema IS TypeScript) | Full (generated client) | Partial (decorators lose types) |
| NestJS integration | Community module (@knaadh/nestjs-drizzle) | Official | Official (@nestjs/typeorm) |
| Migration DX | drizzle-kit push/generate | prisma migrate | CLI migrations |
| Bundle size | Tiny (~30KB) | Heavy (~2MB engine) | Moderate |
| Lock-in | None (plain SQL) | High (proprietary DSL) | Low |
| Maintenance | Active, growing fast | Active | Spotty (critical bugs sit months) |

**Recommendation:** Use Drizzle ORM with `@knaadh/nestjs-drizzle` for PostgreSQL integration. The lack of official NestJS module is the only downside, and the community module is solid. If the team strongly prefers first-party support, Prisma is the fallback, but the performance and lock-in tradeoffs are real.

### Job Queue

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| BullMQ | 5.69.x | Async job processing | Pre-decided. Handles image generation jobs, presentation compilation, document parsing. Redis-backed for persistence and distributed workers. | HIGH |
| @nestjs/bullmq | 11.0.x | NestJS integration | Official NestJS module. Decorator-based job processors (`@Processor`, `@Process`). Supports named queues for separating concerns (image-gen, compile, parse). | HIGH |

**Queue Architecture (3 named queues):**
1. `document-parse` - Extract text from uploaded PDFs/DOCX/MD files
2. `image-generate` - Call Replicate API for each slide image
3. `presentation-compile` - Assemble final presentation (PPTX/HTML/Google Slides)

**Why BullMQ over alternatives:**
- Agenda.js: MongoDB-based, adds unnecessary DB dependency.
- Bee-Queue: Abandoned (last commit 2021).
- RabbitMQ/Kafka: Overkill for a SaaS with <10K concurrent jobs. BullMQ provides enough with Redis.
- Temporal.io: Powerful but complex orchestration layer not needed at MVP stage.

### File Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @aws-sdk/client-s3 | 3.990.x | S3-compatible storage | Cloud-agnostic via S3 protocol. Works with AWS S3, MinIO (self-hosted), Cloudflare R2, Backblaze B2. Stores uploaded knowledge bases and generated presentations. | HIGH |
| MinIO | Latest | Local dev S3 | Docker-based S3-compatible storage for local development. Identical API to production S3. | HIGH |
| multer | 1.4.x | File upload middleware | NestJS has built-in multer support via `@nestjs/platform-express`. Handles multipart form uploads before S3 transfer. | HIGH |

**Storage Architecture:**
```
Buckets:
  uploads/        - Raw user uploads (PDF, DOCX, MD)
  parsed/         - Extracted text (JSON)
  images/         - AI-generated images
  presentations/  - Final output files (PPTX, HTML)
```

**Why S3-compatible over alternatives:**
- Direct filesystem: Not horizontally scalable, lost on container restart.
- Google Cloud Storage: Vendor lock-in, no local equivalent.
- Azure Blob Storage: Same lock-in concern.
- S3 protocol: Universal. MinIO for local dev, any provider in production.

### Document Parsing

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| pdf-parse | 2.4.x | PDF text extraction | Pure TypeScript, cross-platform. Fast for text extraction (our primary need). Does not require system dependencies. 2.x is a major rewrite with improved Node 22+ support. | HIGH |
| mammoth | 1.11.x | DOCX to HTML/text | De facto standard for DOCX parsing in Node.js. Semantic extraction (headings, lists, emphasis). TypeScript types included. 729 dependents on npm. | HIGH |
| marked | 17.0.x | Markdown parsing | 26M weekly downloads. Built for speed. Converts MD to HTML for content extraction. Actively maintained (v17 published 2 days ago). | HIGH |

**What NOT to use:**
- `pdf.js` / `pdfjs-dist`: 2-3x slower than pdf-parse. Overkill for text extraction (designed for rendering). Use only if you need spatial positioning of text on pages.
- `docx`: Lower-level DOCX manipulation library. Good for creating DOCX, wrong tool for reading/extracting content.
- `unified`/`remark`: More powerful Markdown AST but unnecessary complexity for plain text extraction. Use `marked` for speed.

**Parsing Pipeline:**
```
Upload → Detect MIME type → Route to parser:
  .pdf  → pdf-parse → extracted text + metadata
  .docx → mammoth → HTML → strip tags → text + structure
  .md   → marked → HTML → strip tags → text + structure
  URL   → fetch → readability (mozilla) → text + structure
```

### Presentation Generation

**CRITICAL FINDING:** Marp CLI's PPTX output renders slides as background images, making them non-editable in PowerPoint. The `--pptx-editable` flag is experimental, requires LibreOffice installed, and produces lower quality output. This is a significant limitation for a SaaS product where users expect editable decks.

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PptxGenJS | 4.0.x | PPTX generation (PRIMARY) | Programmatic, fully editable PPTX creation. Text, images, shapes, charts, tables. OOXML-compliant. Works in Node.js. 165 npm dependents. This is the right tool for a SaaS product. | HIGH |
| Marp CLI | 4.2.x | HTML presentation + PDF | Best for HTML slide decks and PDFs. Markdown-in, beautiful-slides-out. Use for the web preview format, NOT for PPTX export. | HIGH |
| reveal.js | 5.2.x | HTML presentation viewer | Embed in web app for in-browser slide viewing. Markdown support, speaker notes, animations. Use for the "preview" experience before download. | MEDIUM |
| Google Slides API | v1 (googleapis) | Google Slides export | For users who want output directly in Google Slides. REST API via `googleapis` npm package. Requires OAuth consent flow. Defer to post-MVP. | MEDIUM |

**Presentation Generation Strategy:**

| Output Format | Technology | Editability | When |
|---------------|-----------|-------------|------|
| PPTX (download) | PptxGenJS | Fully editable | MVP - Primary output |
| HTML (web view) | Marp CLI or reveal.js | View-only in browser | MVP - Preview |
| PDF (download) | Marp CLI | View-only | MVP - Secondary output |
| Google Slides | Google Slides API | Fully editable | Post-MVP |

**Why NOT rely on Marp for PPTX:**
- PPTX output is pre-rendered images (non-editable text, non-movable elements).
- `--pptx-editable` requires LibreOffice Impress installed on the server (heavyweight dependency).
- Experimental flag with "lower reproducibility" per official docs.
- Users paying for a SaaS expect editable slides they can customize.

**PptxGenJS gives us:**
- Full programmatic control over slide elements (text boxes, images, shapes).
- Design constraint engine can position elements precisely.
- Editable output that users can modify in PowerPoint/Keynote/Google Slides.
- No system dependencies (pure JavaScript).

### Image Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| replicate | 1.4.x | Replicate API client | Pre-decided. Official Node.js SDK. Handles model invocation, webhook callbacks, file output. | HIGH |
| FLUX.1 [schnell] | Latest on Replicate | Fast image generation | $0.003/image. Apache 2.0 license (unrestricted commercial use). 1-4 step inference (fastest FLUX variant). Best text rendering of any open model. | HIGH |
| sharp | 0.34.x | Image post-processing | Resize generated images to slide dimensions. Convert formats (WebP to PNG for PPTX compatibility). Optimize file sizes. Fastest Node.js image processor. | HIGH |

**Image Generation Cost Model:**
```
FLUX.1 [schnell]: $0.003/image
Average deck: 10 slides, 5 images → $0.015/deck
With overhead (retries, variants): ~$0.02/deck
Margin at $1/deck credit: 98% gross margin on image generation
```

**Model Alternatives (if FLUX schnell underperforms):**

| Model | Cost/Image | Speed | Quality | Commercial License |
|-------|-----------|-------|---------|-------------------|
| FLUX.1 [schnell] | $0.003 | Fastest | Good | Apache 2.0 (free) |
| FLUX.1 [dev] | $0.030 | Medium | Better | Non-commercial |
| FLUX.1 [pro] | $0.055 | Slower | Best | Paid license |
| SDXL | ~$0.005 | Fast | Good for stylized | Open |

**Recommendation:** Start with FLUX.1 [schnell] for MVP. It has the best cost/speed ratio and unrestricted commercial use. Upgrade to FLUX.1 [pro] for a premium tier later.

**Why Replicate over alternatives:**
- Banana/Nano Banana: Smaller ecosystem, fewer model options.
- fal.ai: Competitive pricing but smaller community.
- RunPod: Serverless GPU, but you manage the model deployment yourself.
- Self-hosted: Requires GPU infrastructure. Premature optimization at MVP.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @nestjs/passport | 11.x | Auth framework | Official NestJS integration. Strategy-based (JWT now, OAuth later). Guards-based route protection. | HIGH |
| passport-jwt | 4.0.x | JWT strategy | Standard JWT validation strategy for Passport. | HIGH |
| @nestjs/jwt | 11.x | JWT token operations | Sign/verify tokens. Access + refresh token pattern. | HIGH |
| argon2 | 0.41.x | Password hashing | Recommended over bcrypt for new projects. Winner of Password Hashing Competition. Memory-hard (resists GPU attacks). bcrypt uses fixed 4KB memory; argon2id with 64MB makes GPU cracking infeasible. | MEDIUM |

**Why argon2 over bcrypt:**
- bcrypt: 4KB fixed memory. GPU with 8GB can run millions of parallel hashes.
- argon2id: 64MB configurable memory. Same GPU limited to ~125 parallel computations.
- OWASP 2024 recommends argon2id as primary choice.
- Node.js `argon2` package is well-maintained, no native compilation issues on modern Node.

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
| stripe | 20.3.x | Payment processing | Industry standard. New Billing Meters API (replaces legacy usage records). Credit-based pricing model has first-class support. Stripe API version 2026-01-28.clover. | HIGH |

**CRITICAL: Stripe API Migration Required**
Legacy usage records API removed in Stripe version `2025-03-31.basil`. New projects MUST use the Billing Meters API:
- Create a `Meter` for image generation credits
- Send `MeterEvent` for each credit consumed
- Attach meters to prices for automatic billing
- Credit-based pricing model documented at: https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model

**Credit System Architecture:**
```
Purchase: User buys credit pack → Stripe Checkout → webhook → add credits to DB
Consume:  User generates deck → deduct credits from DB → send MeterEvent to Stripe
Track:    Stripe meter aggregates usage per billing period
Refund:   Failed generations → credits returned to DB balance
```

**Why Stripe over alternatives:**
- Paddle/LemonSqueezy: Merchant of Record (simpler tax handling) but less control over credit-based billing.
- PayPal: Worse DX, no meter API equivalent.
- Stripe is the only provider with a first-class credit-based pricing SDK.

### Deployment & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | Latest | Containerization | Standard. Multi-stage builds for small production images. Docker Compose for local dev (app + PostgreSQL + Redis + MinIO). | HIGH |
| Docker Compose | 2.x | Local dev orchestration | Single `docker-compose up` spins up entire stack. | HIGH |

**Docker Compose Services:**
```yaml
services:
  app:         # NestJS application
  postgres:    # PostgreSQL 16
  redis:       # Redis 7
  minio:       # S3-compatible storage
  bullboard:   # BullMQ dashboard (dev only)
```

**Cloud-Agnostic Deployment Options:**
- **AWS:** ECS/Fargate + RDS + ElastiCache + S3
- **GCP:** Cloud Run + Cloud SQL + Memorystore + GCS
- **Railway/Render:** Simplest for MVP (managed PostgreSQL + Redis included)
- **Self-hosted:** Docker Compose on a VPS (Hetzner, DigitalOcean)

**Recommendation:** Start on Railway or Render for MVP speed. Migrate to AWS/GCP when scaling demands it.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| class-validator | 0.14.x | DTO validation | Every API endpoint. Decorators match NestJS style. | HIGH |
| class-transformer | 0.5.x | DTO transformation | Pairs with class-validator for request/response shaping. | HIGH |
| @nestjs/config | 4.x | Environment config | .env management. Type-safe config with validation. | HIGH |
| @nestjs/swagger | 8.x | API documentation | Auto-generate OpenAPI spec from decorators. Essential for frontend integration. | HIGH |
| helmet | 8.x | HTTP security headers | Standard security middleware. | HIGH |
| rate-limiter-flexible | 5.x | Rate limiting | Redis-backed. Protect image generation endpoint from abuse. | MEDIUM |
| winston | 3.x | Structured logging | JSON logs for production. Request tracing. | HIGH |
| uuid | 11.x | Unique IDs | Presentation IDs, job IDs. Use UUIDv7 for time-sortable IDs. | HIGH |

### Dev Dependencies

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| vitest | 3.x | Testing | Faster than Jest. ESM-native. Compatible with NestJS. | MEDIUM |
| @nestjs/testing | 11.x | NestJS test utilities | Official testing module. | HIGH |
| eslint | 9.x | Linting | Flat config (ESLint 9). TypeScript-aware. | HIGH |
| prettier | 3.x | Code formatting | Standard. | HIGH |
| tsx | 4.x | TypeScript execution | Fast TS execution for scripts and dev. | HIGH |

**Testing Note:** Vitest is recommended over Jest for new projects. NestJS 11 still ships with Jest config by default, but Vitest is faster, ESM-native, and gaining NestJS community adoption. If the team prefers stability, Jest 30.x works fine.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | NestJS 11 | Fastify (standalone) | Lacks structure for multi-module SaaS |
| Framework | NestJS 11 | Hono | Too lightweight for queue management + guards + modules |
| ORM | Drizzle | Prisma | Proprietary DSL lock-in, 2MB engine, N+1 on joins |
| ORM | Drizzle | TypeORM | Spotty maintenance, critical bugs sit months, weaker types |
| PPTX | PptxGenJS | Marp CLI | PPTX output is non-editable background images |
| PPTX | PptxGenJS | python-pptx (via child process) | Adds Python dependency. PptxGenJS is native Node.js |
| Password hash | argon2 | bcrypt | Fixed 4KB memory, GPU-vulnerable. argon2id is OWASP recommended |
| Queue | BullMQ | RabbitMQ | Overkill. Adds infrastructure. BullMQ uses existing Redis |
| Queue | BullMQ | Agenda.js | MongoDB dependency unnecessary |
| Image API | Replicate | fal.ai | Smaller community, fewer model options |
| Image API | Replicate | Self-hosted | Premature. Requires GPU infrastructure |
| Storage | S3-compatible | Local filesystem | Not scalable, lost on container restart |
| Deployment | Railway (MVP) | Kubernetes | Overkill for MVP. Move there at scale |

---

## Installation

```bash
# Core framework
npm install @nestjs/core @nestjs/common @nestjs/platform-fastify rxjs reflect-metadata

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Cache & Queue
npm install @nestjs/bullmq bullmq ioredis

# File storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
npm install -D @types/multer

# Document parsing
npm install pdf-parse mammoth marked
npm install -D @types/mammoth

# Presentation generation
npm install pptxgenjs @marp-team/marp-cli
npm install sharp

# Image generation
npm install replicate

# Authentication
npm install @nestjs/passport passport passport-jwt @nestjs/jwt argon2
npm install -D @types/passport-jwt

# Billing
npm install stripe

# Utilities
npm install class-validator class-transformer @nestjs/config @nestjs/swagger
npm install helmet rate-limiter-flexible winston uuid

# Dev dependencies
npm install -D typescript @nestjs/cli @nestjs/testing
npm install -D vitest @vitest/coverage-v8
npm install -D eslint prettier tsx
npm install -D @types/node
```

**Note on Fastify adapter:** Using `@nestjs/platform-fastify` instead of the default Express adapter. Fastify is 2-3x faster for JSON serialization. NestJS abstracts the difference, so switching later is trivial.

---

## Version Pinning Strategy

Pin major versions in `package.json` using `^` (caret) for patch/minor updates:
```json
{
  "@nestjs/core": "^11.0.0",
  "drizzle-orm": "^0.45.0",
  "bullmq": "^5.69.0",
  "pptxgenjs": "^4.0.0",
  "stripe": "^20.3.0",
  "replicate": "^1.4.0"
}
```

Lock exact versions with `npm ci` in CI/CD (uses package-lock.json).

---

## Sources

### Verified (HIGH confidence)
- NestJS 11.1.13: [npm @nestjs/core](https://www.npmjs.com/package/@nestjs/core) | [NestJS 11 announcement](https://trilon.io/blog/announcing-nestjs-11-whats-new)
- BullMQ 5.69.1: [npm bullmq](https://www.npmjs.com/package/bullmq) | [BullMQ NestJS docs](https://docs.bullmq.io/guide/nestjs)
- PptxGenJS 4.0.1: [npm pptxgenjs](https://www.npmjs.com/package/pptxgenjs) | [GitHub](https://github.com/gitbrent/PptxGenJS)
- Marp CLI 4.2.3: [npm @marp-team/marp-cli](https://www.npmjs.com/package/@marp-team/marp-cli) | [PPTX editability issue #673](https://github.com/marp-team/marp-cli/issues/673)
- pdf-parse 2.4.5: [npm pdf-parse](https://www.npmjs.com/package/pdf-parse)
- mammoth 1.11.0: [npm mammoth](https://www.npmjs.com/package/mammoth)
- marked 17.0.2: [npm marked](https://www.npmjs.com/package/marked)
- sharp 0.34.5: [npm sharp](https://www.npmjs.com/package/sharp)
- Replicate SDK 1.4.0: [npm replicate](https://www.npmjs.com/package/replicate) | [Replicate docs](https://replicate.com/docs/get-started/nodejs)
- Stripe 20.3.1: [npm stripe](https://www.npmjs.com/package/stripe) | [Billing Meters API](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- @aws-sdk/client-s3 3.990.0: [npm @aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)
- FLUX.1 schnell pricing ($0.003/image): [Replicate pricing](https://replicate.com/pricing) | [FLUX collection](https://replicate.com/collections/flux)

### Verified via multiple sources (MEDIUM confidence)
- Drizzle ORM 0.45.1: [npm drizzle-orm](https://www.npmjs.com/package/drizzle-orm) | [14x faster claim](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) | [NestJS integration](https://github.com/knaadh/nestjs-drizzle)
- argon2 over bcrypt: [OWASP recommendation](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) | [Password Hashing Competition](https://ssojet.com/compare-hashing-algorithms/bcrypt-vs-argon2)
- Stripe legacy API removal (2025-03-31.basil): [Stripe changelog](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-legacy-usage-based-billing)
- reveal.js 5.2.1: [npm reveal.js](https://www.npmjs.com/package/reveal.js)

### Training data only (LOW confidence - verify before using)
- Vitest NestJS compatibility: Community adoption is growing but NestJS official templates still ship Jest. Verify setup before committing.
- Drizzle 1.0 beta: A 1.0.0-beta.x exists on npm beta tag. Stick with 0.45.x stable for production.
