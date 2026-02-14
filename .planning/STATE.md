# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Product name:** Pitchable
**Core value:** Chat your way from knowledge base to polished deck
**Current focus:** Phase 2 - Knowledge Base

## Current Position

Phase: 2 of 8 (Knowledge Base)
Plan: 0 of 4 in current phase
Status: Ready to plan Phase 2
Last activity: 2026-02-14 -- Phase 1 complete (all 6 plans verified)

Progress: [██████░░░░░░░░░░░░░░] 12.5% (1 of 8 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~5 min/plan
- Total execution time: ~30 min

**By Phase:**

| Phase | Plans | Completed | In Progress |
|-------|-------|-----------|-------------|
| 01-Foundation | 6 | 6 | 0 |

**Recent Trend:**
- Plans 01-01 through 01-06: All verified
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

### Phase 1 Deliverables

77 TypeScript files across apps/api (62) and apps/web (15):
- **Frontend**: Split-screen layout, auth pages (login, register, forgot/reset password), dashboard, settings, workspace
- **Auth**: JWT access (15m) + refresh (7d) token rotation, argon2, protected routes, Zustand auth store
- **Constraints**: Color (4 forbidden pairs, WCAG AA), typography (9 banned fonts, 10 allowed), density (6 bullets, 80 words), layout (columns, font sizes, colors)
- **Themes**: 5 validated themes (dark-professional, light-minimal, corporate-blue, creative-warm, technical-teal)
- **Infrastructure**: Docker Compose (pgvector, Redis, MinIO), Swagger, rate limiting, health checks, structured errors
- **Prisma Schema**: 8 models, 8 enums
- **Existing modules**: Credits, Exports (Marp, Reveal.js), Images (Replicate, BullMQ)

### Completed Plans

- **01-01**: Turborepo monorepo (apps/api, apps/web workspaces)
- **01-02**: Docker Compose (pgvector, Redis, MinIO), Swagger, throttling, health checks, Prisma 7 adapter, env validation
- **01-03**: argon2 auth, dual JWT (access 15m + refresh 7d), forgot/reset password
- **01-04**: Layout validator (DC-06), unified validator + constraints controller with POST /constraints/validate
- **01-05**: Fixed all 5 theme font pairings (geometric + humanist), startup validation, Swagger docs
- **01-06**: Frontend shell (auth pages, dashboard, settings, split-screen workspace, API client with token refresh)

### Blockers/Concerns

- LocalStrategy and LocalAuthGuard files still exist but are unused (dead code) -- cleanup optional
- Constraint color validator has 4 pairs but REQUIREMENTS.md lists 8 -- gap to address in Phase 3 or constraints update

## Session Continuity

Last session: 2026-02-14
Stopped at: Phase 1 verified complete. Ready to plan Phase 2 (Knowledge Base).
Resume: Plan and execute Phase 2
