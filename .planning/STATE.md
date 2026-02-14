# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Product name:** DeckPilot
**Core value:** Chat your way from knowledge base to polished deck
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 8 (Foundation)
Plan: 0 of 6 in current phase (PLAN.md written, ready to execute)
Status: Ready to execute
Last activity: 2026-02-14 -- Phase 1 plan created (6 sub-plans)

Progress: [░░░░░░░░░░░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none
- Trend: N/A

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

### Blockers/Concerns

- Existing auth uses bcrypt -- must migrate to argon2 (Plan 01-03)
- Existing constraints have only 4 banned color pairs -- must extend to 8 (Plan 01-04)
- Existing density validator allows max 5 bullets -- requirement is max 6 (Plan 01-04)
- Existing typography validator allows 18pt body min -- requirement is 24pt (Plan 01-04)
- No frontend exists -- must build from scratch (Plan 01-06)

## Session Continuity

Last session: 2026-02-14
Stopped at: Phase 1 plan written, ready to execute Plan 01-01 (Monorepo Setup)
Resume file: .planning/plans/01-PLAN.md
