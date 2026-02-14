# Project Research Summary

**Project:** SlideForge -- AI Presentation Generation SaaS
**Domain:** Document-to-presentation pipeline with AI image generation and design guardrails
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

SlideForge is a SaaS product that transforms knowledge bases into professional presentations with AI-generated visuals and enforced design quality. The competitive landscape (Gamma, Beautiful.ai, Canva, GenPPT, Plus AI) reveals two underserved gaps: persistent multi-document knowledge base ingestion with RAG retrieval, and algorithmic design constraint enforcement at generation time rather than template time. No competitor does both. The recommended build approach is a NestJS modular monolith with PostgreSQL + pgvector, BullMQ for async job processing, PptxGenJS for editable PPTX output, and Replicate (FLUX.1 schnell) for image generation at $0.003/image.

The single most important architectural decision is building the design constraint engine as a first-class system in Phase 1, not as a styling layer added later. Competitor analysis shows that ugly output is the #1 trust killer: Gamma holds a 1.9/5 on Trustpilot largely due to design quality complaints. Beautiful.ai's success comes from making it "nearly impossible to create an ugly presentation" through Smart Slides constraints. SlideForge must match this bar through AI-enforced generation rules (typography limits, WCAG contrast validation, content density caps, banned color/font combinations) that prevent bad output from ever reaching the user.

The primary risks are: (1) PPTX export fidelity -- broken formatting on export is the #1 complaint across every competitor, and Marp CLI's PPTX output is non-editable background images, forcing PptxGenJS as the PPTX engine; (2) image generation cost explosion at scale if pricing does not model per-generation variable costs; and (3) PDF parsing quality for the knowledge base, where complex layouts, tables, and multi-column PDFs will break naive parsers. All three risks have concrete mitigations identified in this research.

## Key Findings

### Recommended Stack

The stack is NestJS 11 on Fastify adapter with TypeScript 5.7, PostgreSQL 16 with pgvector for embeddings, Redis 7 for BullMQ job queues, and S3-compatible storage (MinIO for dev, AWS S3 or R2 for production). Deploy on Railway/Render for MVP speed, migrate to AWS/GCP at scale.

**Core technologies:**
- **NestJS 11 + Fastify adapter:** Backend framework. Decorator-based architecture maps cleanly to the domain's module boundaries (auth, billing, generation, storage, export). Pre-decided.
- **Drizzle ORM 0.45.x:** Database ORM over Prisma/TypeORM. 14x lower latency on complex queries, no proprietary DSL, schema defined in TypeScript, ~30KB bundle vs Prisma's ~2MB. Community NestJS module (`@knaadh/nestjs-drizzle`).
- **PptxGenJS 4.0.x:** PPTX generation (PRIMARY). Produces fully editable PPTX. Replaces Marp CLI for PPTX output after research found Marp's PPTX renders slides as non-editable background images.
- **Marp CLI 4.2.x:** HTML preview and PDF export only. Do NOT use for PPTX.
- **BullMQ 5.69.x:** Three named queues: `document-parse`, `image-generate`, `presentation-compile`. Redis-backed persistence and distributed workers.
- **Replicate (FLUX.1 schnell):** $0.003/image, Apache 2.0 license, 1-4 step inference. 98% gross margin at $1/deck credit pricing.
- **argon2:** Password hashing over bcrypt. OWASP 2024 recommended. 64MB memory-hard vs bcrypt's fixed 4KB.
- **Stripe Billing Meters API:** Credit-based pricing. Legacy usage records API removed in Stripe 2025-03-31.basil. New projects MUST use Meters API.

**Critical version requirements:**
- Node.js 22.x LTS (required by pdf-parse >=22.3.0 and sharp >=20.3.0)
- TypeScript 5.5+ (NestJS 11 requirement)
- Use `pgvector/pgvector:pg16` Docker image (pgvector pre-installed)

### Expected Features

**Must have (table stakes):**
- T1: Prompt-to-deck generation (every competitor has this)
- T2: Document/file upload as source material (GenPPT lacks this and gets destroyed in reviews)
- T3: Professional template library (50+ minimum; GenPPT's 15 templates cause "every deck looks identical" complaints)
- T4: Theme/brand customization (colors, fonts, logo)
- T5: PPTX export (PowerPoint remains universal; Prezi lacks it and reviewers punish it)
- T6: PDF export
- T7: Post-generation editing (click-to-edit, drag; GenPPT's chat-only editing is a dealbreaker)
- T11: Web-link sharing

**Should have (differentiators):**
- D1: Knowledge base ingestion engine (persistent, indexed, multi-document RAG -- genuinely novel, no competitor does this)
- D2: Design constraint engine (AI-enforced generation rules, not just template constraints like Beautiful.ai)
- D3: Configurable image generation tiers (0/3/6/12 images with predictable credit costs)
- D5: Credit-based billing tied to image generation (transparent, Gamma-style but simpler)
- D7: Smart outline generation with user approval (prevents "AI Presentation Paradox" of wasted regenerations)

**Defer (v2+):**
- D4: Google Slides export (requires OAuth complexity)
- D6: Audience-aware content adaptation (executive/technical/sales variants)
- D8: Viewer analytics (requires web sharing infrastructure first)
- T10: Multi-language support (not needed for English-first launch)

**Anti-features (never build):**
- Full WYSIWYG slide editor (multi-year effort, distracts from AI generation)
- Real-time collaboration (CRDT/OT complexity; export to Google Slides instead)
- Video/animation generation (breaks across export formats)
- Opaque credit deductions (Presentations.AI's trust-destroying mistake)

### Architecture Approach

Modular monolith with 10 NestJS modules communicating through service interfaces and BullMQ queues. Pipeline architecture: documents flow through parsing, chunking, embedding, retrieval, slide structuring, design validation, image generation, and export. Each stage is an independent module with clear input/output contracts. The database schema uses PostgreSQL with pgvector for embeddings (raw SQL queries since Drizzle/Prisma lack native vector type support for self-hosted Postgres). Credit pre-authorization via database transactions prevents race conditions on concurrent generation requests.

**Major components:**
1. **Knowledge Base Module** -- Document storage, chunking, embedding (OpenAI text-embedding-3-small), pgvector similarity search
2. **Presentation Module** -- Pipeline orchestrator: retrieval, slide structuring, design validation, status management
3. **Design Constraint Engine** -- Color validation (WCAG AA), typography rules, density limits, banned combinations enforcement
4. **Image Generation Module** -- BullMQ queue with concurrency control (5 concurrent, 10 RPS limiter), Replicate client, credit deduction
5. **Export Pipeline** -- Strategy pattern: PptxGenJS for PPTX, Marp for PDF, Reveal.js for HTML, Google Slides API for GSlides

**Key patterns:**
- Pipeline Orchestrator for multi-step async generation with per-stage failure handling
- BullMQ Worker with rate limiter aligned to Replicate's 600 RPM limit
- Strategy pattern for export renderers behind a common interface
- Credit Guard (NestJS guard) for pre-authorization before expensive operations
- Credit reservation via DB transaction to prevent race conditions

### Critical Pitfalls

1. **Ugly output kills trust instantly (CP-1)** -- Design constraint engine must be Phase 1 architecture, not a bolt-on. Every slide passes validation BEFORE reaching the user. Monitor violation rate; target 0% in production.

2. **Content density overflow (CP-2)** -- LLMs are verbose by default. Hard limits: max 6 bullets/slide, max 10 words/bullet, minimum 24pt font, auto-split overflowing slides. These rules are non-negotiable.

3. **Color combination disasters (CP-3)** -- 15 banned color pairs (red/green, yellow/white, etc.). Every text-background pair must pass WCAG AA (4.5:1 for body, 3:1 for 24pt+). Curated palette system, not arbitrary color picker.

4. **PPTX export fidelity (CP-4)** -- Marp CLI PPTX = non-editable background images. PptxGenJS is the correct tool for editable PPTX. Test every template in every export format before launch. Design features limited to the intersection of what all formats support.

5. **Image generation cost explosion (CP-5)** -- Model worst-case cost per tier before setting prices. FLUX.1 schnell at $0.003/image keeps costs low. Tiered credits (0/3/6/12) give users control. Plan self-hosted migration at >10K images/day.

6. **AI image text rendering failure (CP-6)** -- Never generate text inside images. All text belongs in the slide layer. Add "no text, no words, no labels" to every image prompt. Run OCR validation on generated images.

7. **Knowledge base garbage-in-garbage-out (MP-1)** -- PDF parsing will break on tables, multi-column layouts, headers/footers. Budget 2-3x expected time. Offer "review extracted content" step. Support direct text/markdown as first-class alternatives.

## Excluded Design Combinations

These rules are hard-coded into the design constraint engine. They are not configurable or overridable.

### Banned Color Pairs (text on background)
| Text | Background | Reason |
|------|-----------|--------|
| Red | Green | Invisible to 8% of males (deuteranopia) |
| Green | Red | Same, reversed |
| Red | Black | Disappears for protanopia |
| Yellow | White | WCAG ratio ~1.07:1 |
| Light Gray | White | Invisible on projectors |
| Cyan | White | WCAG ratio ~1.25:1 |
| Blue | Purple | Indistinguishable for tritanopia |
| Neon Green | Neon Pink | Eye fatigue, unprofessional |

**Enforcement rule:** Every text-background pair passes WCAG AA (4.5:1 body, 3:1 large text). Reject and re-palette any failing slide.

### Banned Fonts
Comic Sans MS, Papyrus, Bradley Hand, Curlz MT, Jokerman, Bleeding Cowboys, Impact, Courier New (as body text), any decorative/display font as body text.

### Banned Font Pairings
- Two serif fonts together (insufficient contrast)
- Two script/handwritten fonts together (illegible)
- Two display/decorative fonts together (visual noise)
- Same font for heading and body at similar sizes (no hierarchy)

### Banned Layout Patterns
- Full-bleed image with white text and no overlay (require 30-50% dark overlay minimum)
- More than 2 text columns on a single slide
- Centered body text exceeding 3 lines
- Image + text where text covers >30% of image
- Slide with no visual hierarchy (all same font size)
- More than 3 font sizes on a single slide
- More than 3 distinct colors per slide (excluding neutrals)

## Implications for Roadmap

### Phase 1: Foundation + Design Engine
**Rationale:** Auth and database are prerequisites for every other module. The design constraint engine must be built simultaneously because it validates ALL downstream output. Building generation without constraints means users see ugly slides during testing and early access, destroying trust before the product launches.
**Delivers:** Running NestJS app, Drizzle schema with pgvector, JWT auth, Docker Compose (Postgres + Redis + MinIO), design constraint validators (color, typography, density, layout), theme system with approved palettes and font pairings, banned combination enforcement.
**Addresses:** T4 (theme customization), D2 (design constraint engine)
**Avoids:** CP-1 (ugly output), CP-2 (content density overflow), CP-3 (color disasters), mP-1 (font availability -- design templates tested against export format constraints from day one)

### Phase 2: Knowledge Base + Document Parsing
**Rationale:** The knowledge base is the primary input to the presentation engine. Without RAG retrieval, the product can only generate from raw prompts (generic, undifferentiated). Building this before the presentation engine means the core differentiator (D1) is available from the first end-to-end test.
**Delivers:** File upload (PDF, DOCX, MD), text extraction pipeline, semantic chunking with heading awareness, OpenAI embeddings, pgvector similarity search, document status tracking (UPLOADED -> PARSING -> EMBEDDING -> READY).
**Addresses:** T2 (document upload), D1 (knowledge base ingestion)
**Avoids:** MP-1 (parsing GIGO -- semantic chunking from day one, not fixed-size), MP-2 (context-destroying chunking)
**Uses:** pdf-parse, mammoth, marked, OpenAI text-embedding-3-small, pgvector

### Phase 3: Presentation Generation Engine
**Rationale:** Depends on Knowledge Base (RAG retrieval) and Design Engine (validation). This is the core product: retrieve relevant chunks, structure slides, validate against design constraints, persist. Cannot exist without the two preceding phases.
**Delivers:** Slide structuring from RAG content, presentation CRUD, outline generation with user approval step, design validation pass on every generated slide, speaker notes generation.
**Addresses:** T1 (prompt-to-deck), T7 (post-generation editing), T8 (speaker notes), T9 (slide count selection), D7 (smart outline with approval)
**Avoids:** CP-1 (constraint validation runs on every slide), CP-2 (density limits enforced in structurer)

### Phase 4: Export Pipeline (PDF + PPTX)
**Rationale:** First tangible output users can download. PDF via Marp is the simplest reliable export. PPTX via PptxGenJS is the most demanded format. Ship both together to deliver end-to-end value: upload document, generate deck, download file.
**Delivers:** Marp markdown generation for PDF, PptxGenJS for editable PPTX, file storage (S3-compatible), signed download URLs, web-link sharing.
**Addresses:** T5 (PPTX export), T6 (PDF export), T11 (web-link sharing)
**Avoids:** CP-4 (export fidelity -- PptxGenJS for PPTX, not Marp; test every template in both formats)
**Uses:** PptxGenJS, Marp CLI, @aws-sdk/client-s3, sharp

### Phase 5: Credit System + Billing
**Rationale:** Must exist before image generation (Phase 6), which is the primary credit-consuming operation. Can be built in parallel with Phase 4 export work. Implements Stripe Billing Meters API (new API; legacy removed in 2025-03-31.basil).
**Delivers:** Credit balance tracking, pre-authorization/reservation, purchase flow via Stripe Checkout, webhook handlers, tier enforcement (Free/Starter/Pro/Team), transparent cost display before generation.
**Addresses:** D5 (credit-based billing)
**Avoids:** CP-5 (cost explosion -- model worst-case costs per tier before setting prices), MP-5 (free tier abuse -- email validation, rate limiting, device fingerprinting shipped with billing, not after)

### Phase 6: Image Generation Pipeline
**Rationale:** Depends on Credit System (deduction), Presentation Engine (slide data), and Export Pipeline (image embedding in output). Most complex external integration with async processing, rate limits, and cost implications. Build after the synchronous core pipeline works end-to-end.
**Delivers:** BullMQ queue setup, Replicate client (FLUX.1 schnell), image-per-slide generation with style consistency, prompt engineering with "no text" enforcement, progressive rendering, credit deduction per image, tiered image counts (0/3/6/12).
**Addresses:** D3 (configurable image tiers)
**Avoids:** CP-5 (cost explosion -- tiered credits), CP-6 (text in images -- "no text" in every prompt, OCR validation), MP-3 (style inconsistency -- style parameter system, seed consistency), MP-4 (latency -- parallel generation, progressive rendering)

### Phase 7: Additional Export Formats + Polish
**Rationale:** PPTX + PDF cover 80% of use cases. Reveal.js targets developer/conference niche (unserved by any competitor). Google Slides requires OAuth complexity. Both are lower priority than the core pipeline.
**Delivers:** Reveal.js HTML export (single self-contained file), Google Slides API integration, viewer analytics for web-shared presentations.
**Addresses:** D4 (multi-format), D8 (viewer analytics)
**Avoids:** mP-2 (Reveal.js portability -- single HTML file), mP-3 (OAuth token management)

### Phase Ordering Rationale

- **Design constraints before generation** because Beautiful.ai's success proves constraints must be day-one architecture. Retrofitting validation after shipping produces inconsistent output quality that destroys early user trust.
- **Knowledge base before generation** because the product's primary differentiator is RAG-powered presentations from user content. Without it, SlideForge is just another prompt-to-deck tool in a crowded market.
- **PDF before PPTX** in development order because PDF is simpler and validates the end-to-end pipeline. PPTX is harder (PptxGenJS requires precise element positioning) and benefits from a working reference format.
- **Credits before images** because image generation is the primary variable cost. The pre-authorization pattern must exist before any expensive operation runs.
- **Image generation after core pipeline** because it adds BullMQ async complexity, external API dependencies, and cost management that should not block the core synchronous flow from working.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Knowledge Base):** PDF parsing edge cases for tables, multi-column layouts. Chunking strategy tuning (semantic vs fixed-size, overlap ratios). Needs `/gsd:research-phase` for parser benchmarking.
- **Phase 4 (Export):** PptxGenJS layout engine for complex slide types (charts, diagrams, multi-image layouts). Template design that works across all export formats. Needs `/gsd:research-phase` for PptxGenJS capabilities.
- **Phase 6 (Image Generation):** FLUX.1 schnell prompt engineering for style consistency across a deck. OCR validation pipeline for text detection. Replicate webhook integration vs polling. Needs `/gsd:research-phase` for prompt optimization.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Foundation):** NestJS scaffold, Drizzle ORM, JWT auth, Docker Compose are all well-documented with official guides.
- **Phase 5 (Billing):** Stripe Checkout + Webhooks + Billing Meters API has official documentation and examples.
- **Phase 7 (Additional Exports):** Reveal.js is straightforward HTML templating. Google Slides API has an official Node.js quickstart.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry and official sources. Critical finding: Marp PPTX = non-editable, forcing PptxGenJS. Stripe legacy API removal verified. |
| Features | HIGH | 9 competitors analyzed with direct feature comparison. Pricing data from official sites. Gamma credit system verified against help docs. |
| Architecture | HIGH | NestJS patterns, BullMQ integration, Marp CLI API verified against official docs. pgvector workaround verified via Prisma GitHub issue #18442. |
| Pitfalls | MEDIUM-HIGH | Design/accessibility pitfalls verified via WCAG specs, competitor reviews, and industry standards. Image generation cost data from official API pricing. PDF parsing challenges from NVIDIA and arXiv studies. Some self-hosting cost estimates are approximate. |

**Overall confidence:** HIGH

### Gaps to Address

- **Drizzle ORM NestJS integration maturity:** Community module (`@knaadh/nestjs-drizzle`) is the only option. If it causes friction, Prisma is the documented fallback. Validate during Phase 1 scaffold.
- **Vitest + NestJS compatibility:** NestJS 11 still ships Jest by default. Vitest is recommended for speed but needs validation. If setup is non-trivial, fall back to Jest 30.x.
- **PptxGenJS layout engine limits:** Research confirms PptxGenJS generates editable PPTX, but complex layouts (charts, diagrams, precise multi-element positioning) need hands-on validation during Phase 4.
- **FLUX.1 schnell style consistency:** Prompt engineering for consistent style across a 12-image deck is documented in general terms but reliability varies. Needs empirical testing during Phase 6.
- **Drizzle ORM with pgvector:** The raw SQL workaround for vector operations is well-documented for Prisma but less documented for Drizzle. Validate during Phase 2 that Drizzle's `sql` template tag handles vector queries.
- **ARCHITECTURE.md references Prisma but STACK.md recommends Drizzle:** The architecture research used Prisma in code examples (schema, raw SQL). If Drizzle is chosen, the schema definitions and raw SQL patterns need adaptation. This is straightforward but must not be overlooked.

## Sources

### Primary (HIGH confidence)
- NestJS 11.1.13 official docs and npm registry
- BullMQ 5.69.1 official docs (queue management, NestJS integration)
- PptxGenJS 4.0.1 GitHub and npm (editable PPTX generation)
- Marp CLI 4.2.3 and GitHub issue #673 (PPTX editability limitation)
- WCAG 2.1 SC 1.4.3 (contrast minimum ratios)
- Stripe API changelog (legacy usage records removal in 2025-03-31.basil)
- Replicate pricing ($0.003/image for FLUX.1 schnell)
- pgvector-node GitHub and Prisma issue #18442 (vector type workaround)
- Google Slides API usage limits (official docs)
- Gamma Trustpilot reviews (1.9/5, design quality and export complaints)

### Secondary (MEDIUM confidence)
- Drizzle ORM 14x performance claim (BetterStack benchmark)
- NVIDIA PDF parsing approaches study
- arXiv comparative study of PDF parsing tools
- Zapier and Alai competitor comparison articles
- Beautiful.ai Smart Slides system documentation
- NVIDIA chunking strategy research (87% accuracy for adaptive chunking)

### Tertiary (LOW confidence -- verify before using)
- Vitest NestJS compatibility (community adoption growing, official templates still ship Jest)
- Drizzle 1.0 beta existence (stick with 0.45.x stable)
- Self-hosted image generation cost estimates at scale

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
