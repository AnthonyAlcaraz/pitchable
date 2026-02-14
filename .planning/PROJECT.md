# SlideForge

## What This Is

A SaaS platform that transforms knowledge bases into professional presentations with AI-generated visuals. Users ingest their documents (PDF, MD, DOCX, URLs), choose a visual format and style, and get a polished slide deck with schema diagrams and images — all with design guardrails that prevent ugly combinations. Born from an internal Z4 skill that impressed colleagues enough to ask "how did you do this?"

## Core Value

**Turn any knowledge base into a presentation-ready deck with one click** — the content extraction, slide structuring, visual generation, and design enforcement must work end-to-end without manual intervention.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can sign up, log in, and manage their account
- [ ] Users can ingest knowledge base content (upload files: PDF, MD, DOCX; paste text/URLs)
- [ ] Knowledge base is indexed with vector embeddings for semantic retrieval
- [ ] Users can browse and manage their knowledge base documents
- [ ] When generating a deck, system retrieves relevant KB content via RAG
- [ ] Users can choose output format (PPTX, Google Slides, Reveal.js, PDF)
- [ ] Users can choose number of AI-generated images per deck (0, 3, 6, 12)
- [ ] System enforces design constraints (forbidden color combos, typography rules, density limits)
- [ ] System parses content and structures slides automatically (1 idea per slide, max 5 bullets)
- [ ] System generates schema diagrams via AI (Nano Banana Pro / Replicate API)
- [ ] System uploads images to permanent hosting (Imgur)
- [ ] System exports to multiple formats (Marp/PPTX, Reveal.js HTML, Google Slides, PDF)
- [ ] Users can see and customize presentation themes (dark, light, corporate, creative)
- [ ] Credit-based billing for image generation (per-image credits)
- [ ] Users can iterate on generated decks (regenerate slide, adjust content)

### Out of Scope

- Real-time collaborative editing — too complex for v1, would need operational transform/CRDT
- Native mobile app — web-first, responsive design sufficient for v1
- Video/animation export — static presentations only for v1
- Custom template designer — predefined themes only for v1
- AI slide narration/voiceover — presentation generation focus, not delivery
- Vault integrations (Obsidian, Notion, Confluence) — file upload and URL paste for v1, integrations for v2

## Context

- **Prior art**: Working Z4 skill (Python) that generates multi-format presentations from Z1 analyses. Uses Replicate API (Nano Banana Pro), Google Slides API, Marp CLI, Imgur for image hosting. Proven pipeline that colleagues found impressive.
- **Existing code**: `~/repos/z-commands/scripts/z4_orchestrator.py`, `z4_google_slides.py`, `z4_image_generator.py` — can inform backend design but SaaS will be rewritten as proper service.
- **Design research**: Bad color combos (red+green, red+blue, orange+blue saturated, neon combos), max 2-3 fonts per deck, 1 idea per slide, max 5 bullets, min 24pt body text.
- **Market**: Prezent.ai ($16-60/mo), Beautiful.ai ($15/mo), Presentations.AI ($8-15/mo), GenPPT ($198/yr). Credit-based image generation is standard billing model.
- **Knowledge base ingestion**: Core differentiator. Users upload their documents, system indexes them with vector embeddings, extracts relevant content for presentation topics via RAG. Not just "AI generates slides from a prompt" — it's "AI generates slides from YOUR knowledge."

## Constraints

- **Tech stack**: Node.js + NestJS (TypeScript) for API, Python workers for image generation — matches existing JS ecosystem and Python Z4 scripts
- **Database**: PostgreSQL (users, billing, presentations) + Redis (job queues, caching) + pgvector or Chroma (KB embeddings)
- **Queue**: BullMQ for async image generation jobs
- **Auth**: JWT + bcrypt, OAuth 2.0 later
- **Image generation**: Replicate API (Nano Banana Pro) — proven, good text rendering for schema diagrams
- **Hosting**: Self-hosted initially, designed for cloud deployment (Docker)
- **Budget**: Minimize external service costs — Replicate pay-per-use, Imgur free tier for images

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS over FastAPI | Matches JS ecosystem, strong TypeScript typing, proven for SaaS APIs | — Pending |
| Credit-based billing over flat rate | Industry standard, aligns costs with usage (image gen is expensive) | — Pending |
| Knowledge base upload over vault integrations | Simpler v1 scope, file upload works universally | — Pending |
| Design constraint engine as first-class module | Prevents ugly output — the #1 reason users abandon AI presentation tools | — Pending |
| Nano Banana Pro over DALL-E/Midjourney | Best text rendering for schema diagrams, proven in Z4 | — Pending |
| Marp as primary PPTX engine | Open source, markdown-native, CLI-friendly, proven in Z4 | — Pending |
| pgvector for KB embeddings | Stays in PostgreSQL ecosystem, no separate vector DB to manage | — Pending |

---
*Last updated: 2026-02-14 after initialization — added KB ingestion + RAG requirements*
