# Roadmap: Pitchable

## Overview

Pitchable is a chat-driven AI presentation builder — like Lovable for slides. The roadmap builds a full-stack application: frontend shell with split-screen chat + live preview, backend API with design constraints, knowledge base with RAG, chat-powered generation engine, export pipeline, billing, and image generation. Eight phases, each delivering a verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** — Frontend shell, backend scaffold, auth, Docker, design constraint engine, themes
- [ ] **Phase 2: Knowledge Base** — Document upload, parsing, embedding, and semantic search
- [ ] **Phase 3: Chat + Generation Engine** — Chat interface, live preview, RAG-powered slide generation with real-time updates
- [ ] **Phase 4: Core Export** — PDF and PPTX export with theme-aware rendering
- [ ] **Phase 5: Credit System + Billing** — Credit balance, Stripe subscriptions, transparent cost in chat
- [ ] **Phase 6: Image Generation** — Async image pipeline with BullMQ, Replicate, and credit deduction
- [ ] **Phase 7: Web Sharing + Polish** — Reveal.js HTML export and shareable web links
- [ ] **Phase 8: Landing Page + Onboarding** — Public landing page, pricing page, onboarding flow

## Phase Details

### Phase 1: Foundation
**Goal**: Split-screen app shell running with auth, design constraints, and themes — the skeleton that everything else plugs into
**Depends on**: Nothing (first phase)
**Requirements**: FE-01, FE-02, FE-04..07, AUTH-01..04, DC-01..08, INF-01..07 (FE-03 deferred to Phase 8)
**Plans:** 6 plans
**Success Criteria** (what must be TRUE):
  1. User sees a split-screen layout: empty chat panel left, empty preview panel right
  2. User can sign up, log in, and see a dashboard with their (empty) presentations list
  3. A programmatic test submits a slide with forbidden color combos (red/green), excessive bullets (>6), or banned fonts (Comic Sans), and the API rejects it with specific violation messages
  4. Five built-in themes are available via API with pre-validated color palettes and font pairings
  5. Docker Compose spins up PostgreSQL 16 + pgvector, Redis 7, and MinIO with a single command
  6. OpenAPI/Swagger docs are accessible at /api/docs
  7. Frontend and backend communicate via API, auth flow works end-to-end

Plans:
- [ ] 01-01-PLAN.md — Monorepo setup (Turborepo) + React/Vite/Tailwind/shadcn frontend scaffold
- [ ] 01-02-PLAN.md — Docker Compose upgrade (pgvector + MinIO), Prisma 7 driver adapter, env validation, Swagger, rate limiting, health checks, structured errors
- [ ] 01-03-PLAN.md — Auth rewrite: argon2id, dual JWT (access 15m + refresh 7d), refresh rotation, logout, password reset
- [ ] 01-04-PLAN.md — Design constraint fixes (density limits, typography minimums) + new layout validator (DC-06)
- [ ] 01-05-PLAN.md — Theme font pairing fixes + validation proof + constraints/themes API endpoints
- [ ] 01-06-PLAN.md — Frontend shell: auth pages, dashboard, settings, split-screen workspace layout

### Phase 2: Knowledge Base
**Goal**: Users can upload their documents and the system indexes them for semantic retrieval. Frontend shows KB management UI.
**Depends on**: Phase 1
**Requirements**: KB-01..07
**Success Criteria** (what must be TRUE):
  1. User can upload PDF, DOCX, MD, and TXT files via the frontend and see them listed with status tracking
  2. User can paste raw text or a URL and it appears as a KB source
  3. Given a topic query, the system retrieves the most semantically relevant KB chunks (not keyword match)
  4. User can browse, search, and delete documents in their knowledge base via frontend
  5. Document processing pipeline handles status transitions (UPLOADED -> PARSING -> EMBEDDING -> READY -> ERROR)

Plans:
- [ ] 02-01: File upload API, text/URL ingestion, document storage and status tracking
- [ ] 02-02: Parsing pipeline (pdf-parse, mammoth, marked), heading-aware semantic chunking
- [ ] 02-03: OpenAI embeddings, pgvector storage, RAG retrieval endpoint
- [ ] 02-04: Frontend KB management page (upload, browse, search, delete, status indicators)

### Phase 3: Chat + Generation Engine
**Goal**: Users can chat with the AI co-pilot to generate, iterate, and refine slide decks with real-time preview updates — the core product experience
**Depends on**: Phase 1, Phase 2
**Requirements**: CH-01..08, LP-01..06, PG-01..10, IT-01..06
**Success Criteria** (what must be TRUE):
  1. User types "Create a VC pitch deck about AI agents" in chat and sees an outline appear in the preview panel
  2. User approves the outline and sees slides generate one-by-one in the live preview
  3. User types "make slide 3 more concise" and the preview updates in real-time
  4. User types "/theme dark" and the entire deck re-renders with the dark theme
  5. User can click on any text in the preview to edit it inline
  6. Slide thumbnail sidebar shows all slides with the current slide highlighted
  7. AI responses stream token-by-token in the chat panel
  8. All generated slides pass design constraint validation (zero violations reach the user)
  9. Credit cost is shown in chat before any credit-consuming action

Plans:
- [ ] 03-01: Socket.io setup for real-time communication between frontend and backend
- [ ] 03-02: Chat interface component (input, history, markdown rendering, streaming responses)
- [ ] 03-03: Generation pipeline (RAG retrieval, LLM slide structuring, design validation pass)
- [ ] 03-04: Outline generation with approval flow (shown in chat + preview)
- [ ] 03-05: Live preview component (slide rendering, thumbnail sidebar, click-to-edit)
- [ ] 03-06: Chat-driven iteration (modify slides, change theme, add/remove slides via chat commands)
- [ ] 03-07: Presentation CRUD (list, view, rename, duplicate, delete) + dashboard integration

### Phase 4: Core Export
**Goal**: Users can download their generated deck as a PDF or editable PPTX file, triggered from chat or UI button
**Depends on**: Phase 1, Phase 3
**Requirements**: EX-01, EX-02, EX-04, EX-05
**Success Criteria** (what must be TRUE):
  1. User types "/export pptx" in chat and receives a download link for an editable PPTX
  2. User can export a deck as PDF and open it in any PDF reader with correct formatting
  3. Both formats respect the selected theme (colors, fonts, layout) and pass design constraint checks
  4. Exported files are stored in S3 with signed download URLs

Plans:
- [ ] 04-01: PDF export via Marp CLI with theme-aware markdown generation
- [ ] 04-02: PPTX export via PptxGenJS with editable slide elements
- [ ] 04-03: S3 storage integration, signed download URLs, export chat command (/export)

### Phase 5: Credit System + Billing
**Goal**: Users have a credit balance visible in the dashboard and chat, can purchase credits via Stripe
**Depends on**: Phase 1
**Requirements**: CB-01..09
**Success Criteria** (what must be TRUE):
  1. Credit balance visible in dashboard header and in chat responses
  2. User sees "This will use 6 credits for images. Proceed?" in chat before image generation
  3. User can subscribe to Starter/Pro via Stripe Checkout from settings page
  4. Credit deductions are atomic (no double-charges, no negative balances)
  5. Stripe webhooks correctly handle payment events

Plans:
- [ ] 05-01: Credit balance model, free tier allocation, reservation pattern, atomic deduction
- [ ] 05-02: Stripe Billing Meters API, subscription plans, webhook handlers
- [ ] 05-03: Frontend billing page, credit display in dashboard + chat integration

### Phase 6: Image Generation
**Goal**: Users can request AI-generated images through chat with configurable tiers and async processing
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: IG-01..07
**Success Criteria** (what must be TRUE):
  1. User types "/images 6" in chat and the system generates 6 images with progress shown in chat
  2. Images generate asynchronously with live progress in both chat and preview
  3. Generated images maintain visual consistency across the deck
  4. No text appears in generated images (enforced "no text" in every prompt)
  5. User can type "regenerate image on slide 3" to get a new image for one slide

Plans:
- [ ] 06-01: BullMQ queue setup, Replicate client (FLUX.1 schnell), prompt engineering per slide type
- [ ] 06-02: S3 storage, credit deduction per image, progress tracking via Socket.io
- [ ] 06-03: Image embedding in export formats, single-image regeneration, chat commands

### Phase 7: Web Sharing + Polish
**Goal**: Users can export decks as self-contained HTML and share them via web links
**Depends on**: Phase 3, Phase 4
**Requirements**: EX-03, EX-06
**Success Criteria** (what must be TRUE):
  1. User types "/share" in chat and receives a shareable web link
  2. User can export a deck as a single self-contained Reveal.js HTML file
  3. Shared web presentations render correctly on desktop and mobile browsers

Plans:
- [ ] 07-01: Reveal.js HTML export (single self-contained file)
- [ ] 07-02: Web sharing infrastructure (hosted viewer, shareable links, chat /share command)

### Phase 8: Landing Page + Onboarding
**Goal**: Public-facing landing page converts visitors to sign-ups, smooth onboarding guides new users
**Depends on**: Phase 1, Phase 5
**Requirements**: FE-03 (enhanced)
**Success Criteria** (what must be TRUE):
  1. Non-authenticated user sees a compelling landing page with product demo, features, and pricing
  2. New user completes onboarding: upload first document, generate first deck, see result
  3. Pricing page shows tiers with clear feature comparison

Plans:
- [ ] 08-01: Landing page (hero, features, social proof, pricing, CTA)
- [ ] 08-02: Onboarding flow (guided first-deck experience)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
(Phase 5 can run in parallel with Phase 4 since both depend on Phase 1, not each other)

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation | 0/6 | Planning complete | - |
| 2. Knowledge Base | 0/4 | Not started | - |
| 3. Chat + Generation Engine | 0/7 | Not started | - |
| 4. Core Export | 0/3 | Not started | - |
| 5. Credit System + Billing | 0/3 | Not started | - |
| 6. Image Generation | 0/3 | Not started | - |
| 7. Web Sharing + Polish | 0/2 | Not started | - |
| 8. Landing Page + Onboarding | 0/2 | Not started | - |
