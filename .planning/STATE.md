# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Product name:** DeckPilot
**Core value:** Chat your way from knowledge base to polished deck
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 8 (Foundation)
Plan: 5 of 6 complete (01-06 in progress)
Status: Executing Plan 01-06 (Frontend Shell)
Last activity: 2026-02-14 -- Plans 01-01 through 01-05 complete

Progress: [████████████████░░░░] 83%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~5 min/plan
- Total execution time: ~25 min

**By Phase:**

| Phase | Plans | Completed | In Progress |
|-------|-------|-----------|-------------|
| 01-Foundation | 6 | 5 | 1 (01-06) |

**Recent Trend:**
- Plans 01-01 through 01-05: All passed type-check
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Design constraint engine in Phase 1 (not bolted on later) per research finding CP-1
- [Roadmap]: PptxGenJS for PPTX export (Marp PPTX produces non-editable background images)
- [Phase 1]: Keep Prisma 7 (already implemented with full schema, 8 models, 8 enums). Drizzle migration would waste effort.
- [Phase 1]: argon2 over bcrypt for password hashing (OWASP 2024 recommendation) -- existing bcrypt code will be migrated
- [Phase 1]: Switch from Express to Fastify adapter for NestJS
- [Roadmap]: Stripe Billing Meters API (legacy usage records removed in 2025-03-31.basil)
- [Research]: FLUX.1 schnell over Nano Banana Pro ($0.003/image, Apache 2.0 license)
- [Research]: BullMQ for Node-Python interop (not HTTP microservices, not child processes)

### Existing Codebase (Pre-Phase 1)

47 TypeScript files already exist (untracked in git):
- **Auth**: JWT + Local passport strategies, bcrypt hashing, role/permission guards
- **Constraints**: Color validator (4 forbidden pairs), density validator (max 5 bullets), typography validator (10 whitelisted fonts)
- **Themes**: 5 built-in themes (dark-professional, light-minimal, corporate-blue, creative-warm, technical-teal)
- **Prisma Schema**: 8 models (User, Presentation, Slide, Theme, CreditTransaction, ExportJob, ImageJob), 8 enums
- **Credits**: Transaction tracking, user balance
- **Exports**: Marp exporter, RevealJS exporter
- **Images**: Replicate API service, Imgur uploader, prompt builder, BullMQ processor
- **Docker**: Postgres 16 + Redis 7 (missing pgvector and MinIO)

Phase 1 extends this codebase rather than rewriting it.

### Pending Todos

None yet.

### Completed Plans

- **01-01**: Turborepo monorepo (apps/api, apps/web workspaces)
- **01-02**: Docker Compose (pgvector, Redis, MinIO), Swagger, throttling, health checks, Prisma 7 adapter, env validation
- **01-03**: argon2 auth, dual JWT (access 15m + refresh 7d), forgot/reset password, removed LocalStrategy
- **01-04**: Layout validator (DC-06), wired into unified validator + constraints controller with POST /constraints/validate
- **01-05**: Fixed all 5 theme font pairings (geometric + humanist), startup validation, Swagger docs on themes

### Blockers/Concerns

- Plan 01-06 (frontend) in progress — the last plan in Phase 1
- LocalStrategy and LocalAuthGuard files still exist but are unused (dead code)

## Session Continuity

Last session: 2026-02-14
Stopped at: Executing Plan 01-06 (Frontend Shell)
Resume: Complete 01-06, then verify Phase 1 and move to Phase 2
