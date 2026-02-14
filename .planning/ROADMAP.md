# Roadmap: SlideForge

## Overview

SlideForge delivers an end-to-end pipeline from knowledge base ingestion to polished presentation export. The roadmap builds foundation-up: authentication and design constraints first (because ugly output kills trust before launch), then the knowledge base that differentiates us from every competitor, then the generation engine that connects them, then exports, billing, and image generation as layered capabilities. Seven phases, each delivering a verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Design Engine** — Auth, database, Docker, design constraint validators, theme system, infrastructure
- [ ] **Phase 2: Knowledge Base** — Document upload, parsing, embedding, and semantic search
- [ ] **Phase 3: Presentation Generation** — RAG-powered slide structuring with outline approval and post-generation editing
- [ ] **Phase 4: Core Export** — PDF and PPTX export with theme-aware rendering
- [ ] **Phase 5: Credit System + Billing** — Credit balance, Stripe subscriptions, and transparent cost display
- [ ] **Phase 6: Image Generation** — Async image pipeline with BullMQ, Replicate, and credit deduction
- [ ] **Phase 7: Web Sharing + Polish** — Reveal.js HTML export and shareable web links

## Phase Details

### Phase 1: Foundation + Design Engine
**Goal**: Users can authenticate and the system enforces design quality rules that prevent ugly output from ever reaching downstream phases
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01..04, DC-01..08, INF-01..07
**Success Criteria** (what must be TRUE):
  1. User can create an account, log in with JWT, and stay logged in via refresh tokens
  2. User can reset a forgotten password via email
  3. A programmatic test submits a slide with forbidden color combos (red/green), excessive bullets (>6), or banned fonts (Comic Sans), and the system rejects it with specific violation messages
  4. Five built-in themes are available with pre-validated color palettes and font pairings
  5. Docker Compose spins up PostgreSQL 16 + pgvector, Redis 7, and MinIO with a single command
  6. OpenAPI/Swagger docs are auto-generated and accessible at /api/docs

Plans:
- [ ] 01-01: NestJS scaffold, Docker Compose (Postgres + pgvector + Redis + MinIO), Drizzle schema, env config
- [ ] 01-02: JWT auth (argon2 hashing, access/refresh tokens, guards, password reset)
- [ ] 01-03: Design constraint engine (color WCAG validator, banned pairs, typography rules, density limits, auto-split)
- [ ] 01-04: Theme system (5 themes, palette validation, font pairing enforcement)
- [ ] 01-05: Infrastructure (Swagger, rate limiting, error standardization, health checks)

### Phase 2: Knowledge Base
**Goal**: Users can upload their documents and the system indexes them for semantic retrieval
**Depends on**: Phase 1
**Requirements**: KB-01..07
**Success Criteria** (what must be TRUE):
  1. User can upload PDF, DOCX, MD, and TXT files and see them listed with status tracking
  2. User can paste raw text or a URL and it appears as a KB source
  3. Given a topic query, the system retrieves the most semantically relevant KB chunks (not keyword match)
  4. User can browse, search, and delete documents in their knowledge base
  5. Document processing pipeline handles status transitions (UPLOADED -> PARSING -> EMBEDDING -> READY -> ERROR)

Plans:
- [ ] 02-01: File upload, text/URL ingestion, document storage and status tracking
- [ ] 02-02: Parsing pipeline (pdf-parse, mammoth, marked), heading-aware semantic chunking
- [ ] 02-03: OpenAI embeddings, pgvector storage, RAG retrieval endpoint, KB management API

### Phase 3: Presentation Generation
**Goal**: Users can generate a structured slide deck from their KB content, approve an outline first, and edit slides after generation
**Depends on**: Phase 1, Phase 2
**Requirements**: PG-01..10, IT-01..06
**Success Criteria** (what must be TRUE):
  1. User enters a topic, selects slide count and type, and receives an outline for approval before full generation
  2. Generated slides follow 1-idea-per-slide / max-6-bullets and include speaker notes
  3. User can edit slide text, reorder slides, delete slides, and add blank slides
  4. User can regenerate a single slide with fresh content from KB
  5. All generated slides pass design constraint validation (zero violations reach the user)

Plans:
- [ ] 03-01: Generation pipeline (RAG retrieval, LLM slide structuring, design validation pass)
- [ ] 03-02: Outline generation with user approval flow
- [ ] 03-03: Post-generation editing (text edit, reorder, delete, add, single-slide regeneration)
- [ ] 03-04: Presentation CRUD (list, view, rename, duplicate, delete)

### Phase 4: Core Export
**Goal**: Users can download their generated deck as a PDF or editable PPTX file
**Depends on**: Phase 1, Phase 3
**Requirements**: EX-01, EX-02, EX-04, EX-05
**Success Criteria** (what must be TRUE):
  1. User can export a deck as PDF and open it in any PDF reader with correct formatting
  2. User can export a deck as PPTX and edit individual slide elements in PowerPoint (editable, not images)
  3. Both formats respect the selected theme (colors, fonts, layout) and pass design constraint checks
  4. Exported files are stored in S3 with signed download URLs

Plans:
- [ ] 04-01: PDF export via Marp CLI with theme-aware markdown generation
- [ ] 04-02: PPTX export via PptxGenJS with editable slide elements
- [ ] 04-03: S3 storage integration and signed download URLs

### Phase 5: Credit System + Billing
**Goal**: Users have a credit balance and can purchase credits via Stripe to pay for image generation
**Depends on**: Phase 1
**Requirements**: CB-01..09
**Success Criteria** (what must be TRUE):
  1. New free-tier user can generate 3 text-only decks/month
  2. User can see exactly how many credits an image generation will cost before confirming
  3. User can subscribe to Starter/Pro via Stripe Checkout and see monthly credit refills
  4. Credit deductions are atomic (no double-charges on concurrent requests, no negative balances)
  5. Stripe webhooks correctly handle payment success, failure, and subscription changes

Plans:
- [ ] 05-01: Credit balance model, free tier allocation, reservation pattern, atomic deduction
- [ ] 05-02: Stripe Billing Meters API integration, subscription plans, webhook handlers

### Phase 6: Image Generation
**Goal**: Users can add AI-generated images to their decks with configurable tiers and async processing
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: IG-01..07
**Success Criteria** (what must be TRUE):
  1. User can select image tier (0, 3, 6, or 12) and see the credit cost before generation
  2. Images generate asynchronously with visible progress tracking
  3. Generated images match slide content and maintain visual consistency across the deck
  4. "No text, no words, no labels" enforced in every prompt — no text appears in generated images
  5. User can regenerate any individual slide image
  6. Generated images appear correctly in exported PDF and PPTX files

Plans:
- [ ] 06-01: BullMQ queue setup, Replicate client (FLUX.1 schnell), prompt engineering per slide type
- [ ] 06-02: S3 storage, credit deduction per image, progress tracking
- [ ] 06-03: Image embedding in export formats and single-image regeneration

### Phase 7: Web Sharing + Polish
**Goal**: Users can export decks as self-contained HTML and share them via web links
**Depends on**: Phase 3, Phase 4
**Requirements**: EX-03, EX-06
**Success Criteria** (what must be TRUE):
  1. User can export a deck as a single self-contained Reveal.js HTML file that opens in any browser
  2. User can generate a shareable web link for any deck that others can view without an account
  3. Shared web presentations render correctly on desktop and mobile browsers

Plans:
- [ ] 07-01: Reveal.js HTML export (single self-contained file)
- [ ] 07-02: Web sharing infrastructure (hosted viewer, shareable links)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
(Phase 5 can run in parallel with Phase 4 since both depend on Phase 1, not each other)

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation + Design Engine | 0/5 | Not started | - |
| 2. Knowledge Base | 0/3 | Not started | - |
| 3. Presentation Generation | 0/4 | Not started | - |
| 4. Core Export | 0/3 | Not started | - |
| 5. Credit System + Billing | 0/2 | Not started | - |
| 6. Image Generation | 0/3 | Not started | - |
| 7. Web Sharing + Polish | 0/2 | Not started | - |
