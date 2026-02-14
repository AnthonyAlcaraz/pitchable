# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Product name:** Pitchable
**Core value:** Chat your way from knowledge base to polished deck
**Current focus:** EdgeQuake Graph-RAG sidecar integrated. Ready for Phase 3.

## Current Position

Phase: 2 of 8 (Knowledge Base) -- COMPLETE + EdgeQuake Integration
Plan: 4 of 4 in current phase + EdgeQuake sidecar
Status: EdgeQuake Graph-RAG integrated as sidecar. Ready to plan Phase 3 (Chat + Generation Engine).
Last activity: 2026-02-14 -- EdgeQuake sidecar integration complete

Progress: [█████████████░░░░░░░] 25% (2 of 8 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: ~5 min/plan
- Total execution time: ~50 min

**By Phase:**

| Phase | Plans | Completed | In Progress |
|-------|-------|-----------|-------------|
| 01-Foundation | 6 | 6 | 0 |
| 02-Knowledge Base | 4 | 4 | 0 |

**Recent Trend:**
- Plans 02-01 through 02-04: All executed, TypeScript clean
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Design constraint engine in Phase 1 (not bolted on later) per research finding CP-1
- [Roadmap]: PptxGenJS for PPTX export (Marp PPTX produces non-editable background images)
- [Phase 1]: Keep Prisma 7 (already implemented with full schema, 8 models, 8 enums). Drizzle migration would waste effort.
- [Phase 1]: argon2 over bcrypt for password hashing (OWASP 2024 recommendation)
- [Phase 1]: Switch from Express to Fastify adapter for NestJS
- [Roadmap]: Stripe Billing Meters API (legacy usage records removed in 2025-03-31.basil)
- [Research]: FLUX.1 schnell over Nano Banana Pro ($0.003/image, Apache 2.0 license)
- [Research]: BullMQ for Node-Python interop (not HTTP microservices, not child processes)
- [Naming]: DeckPilot renamed to Pitchable (Lovable-style adjective name)
- [Architecture]: Self-improving loop is core differentiator (PG-13, PG-14)
- [Architecture]: PaperBanana 5-agent image pipeline from Z4 (IG-08..10)
- [Skills]: 8 Skill Retriever components installed for Phase 1-5 acceleration
- [Phase 2]: pdf-parse v2 uses class-based API (PDFParse, data in constructor, getText/getInfo/destroy)
- [Phase 2]: pgvector import as `import * as pgvector from 'pgvector'` (CJS module)
- [Phase 2]: Express adapter confirmed (not Fastify) -- Multer for file uploads
- [Phase 2]: EdgeQuake Graph-RAG as sidecar (separate PG with Apache AGE on :5433)
- [Phase 2]: Feature flag EDGEQUAKE_ENABLED gates all Graph-RAG code, pgvector fallback if disabled/down
- [Phase 2]: Per-user EdgeQuakeMapping for tenant/workspace isolation

### Phase 1 Deliverables

77 TypeScript files across apps/api (62) and apps/web (15):
- **Frontend**: Split-screen layout, auth pages (login, register, forgot/reset password), dashboard, settings, workspace
- **Auth**: JWT access (15m) + refresh (7d) token rotation, argon2, protected routes, Zustand auth store
- **Constraints**: Color (4 forbidden pairs, WCAG AA), typography (9 banned fonts, 10 allowed), density (6 bullets, 80 words), layout (columns, font sizes, colors)
- **Themes**: 5 validated themes (dark-professional, light-minimal, corporate-blue, creative-warm, technical-teal)
- **Infrastructure**: Docker Compose (pgvector, Redis, MinIO), Swagger, rate limiting, health checks, structured errors
- **Prisma Schema**: 8 models, 8 enums
- **Existing modules**: Credits, Exports (Marp, Reveal.js), Images (Replicate, BullMQ)

### Phase 2 Deliverables

~30 TypeScript files across apps/api (~20) and apps/web (~10):
- **Backend**: Document + DocumentChunk models, S3 service, 7 controller endpoints (upload, text, url, list, get, delete, search)
- **Parsers**: PDF (pdf-parse v2), DOCX (mammoth), Markdown (marked), Text, URL (readability + jsdom)
- **Chunking**: Heading-aware semantic chunker with overlap
- **Pipeline**: BullMQ processor: UPLOADED → PARSING → EMBEDDING → READY (or ERROR)
- **Embeddings**: OpenAI text-embedding-3-small, batch 100/call
- **Vector Search**: pgvector raw SQL, cosine similarity via <=> operator, HNSW index
- **Frontend**: KB page with drag-and-drop upload, text/URL input, document list with status badges, semantic search, auto-polling
- **Zustand Store**: useKbStore with full CRUD + search
- **Prisma Schema**: Now 11 models (added EdgeQuakeMapping), 10 enums
- **DeckPilot → Pitchable**: Renamed in sidebar, mobile header, dashboard, Swagger
- **EdgeQuake Sidecar**: Docker Compose adds edgequake API (:8080) + edgequake-db (:5433, pgvector+AGE)
- **EdgeQuakeService**: HTTP client wrapping EdgeQuake REST API (tenant/workspace provisioning, document sync, hybrid query)
- **Dual Search**: EdgeQuake hybrid (vector+graph) first, pgvector cosine fallback if down
- **Non-blocking sync**: Document processing pipeline syncs to EdgeQuake after embedding (failure doesn't break pipeline)

### Completed Plans

- **01-01**: Turborepo monorepo (apps/api, apps/web workspaces)
- **01-02**: Docker Compose (pgvector, Redis, MinIO), Swagger, throttling, health checks, Prisma 7 adapter, env validation
- **01-03**: argon2 auth, dual JWT (access 15m + refresh 7d), forgot/reset password
- **01-04**: Layout validator (DC-06), unified validator + constraints controller with POST /constraints/validate
- **01-05**: Fixed all 5 theme font pairings (geometric + humanist), startup validation, Swagger docs
- **01-06**: Frontend shell (auth pages, dashboard, settings, split-screen workspace, API client with token refresh)
- **02-01**: Prisma schema (Document + DocumentChunk), S3 service, file upload/text/URL endpoints, document CRUD
- **02-02**: Parsing pipeline (pdf-parse v2, mammoth, marked, readability), heading-aware chunking, BullMQ processor
- **02-03**: OpenAI embeddings, pgvector storage, RAG search endpoint, full pipeline integration
- **02-04**: Frontend KB page (upload, browse, search, delete, status badges, DeckPilot→Pitchable rename)

### Blockers/Concerns

- LocalStrategy and LocalAuthGuard files still exist but are unused (dead code) -- cleanup optional
- Constraint color validator has 4 pairs but REQUIREMENTS.md lists 8 -- gap to address in Phase 3 or constraints update
- Docker not running during Phase 2 execution -- migration SQL created manually, needs `prisma migrate deploy` when Docker starts

## Session Continuity

Last session: 2026-02-14
Stopped at: Phase 2 complete + EdgeQuake sidecar integrated. TypeScript clean.
Resume: Plan and execute Phase 3 (Chat + Generation Engine)
