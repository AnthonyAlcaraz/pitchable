# Requirements: SlideForge

**Defined:** 2026-02-14
**Core Value:** Turn any knowledge base into a presentation-ready deck with one click

## v1 Requirements

### Authentication (AUTH)
- [ ] **AUTH-01**: User can sign up with email and password (argon2 hashing)
- [ ] **AUTH-02**: User can log in and receive JWT access + refresh tokens
- [ ] **AUTH-03**: User can log out and invalidate refresh token
- [ ] **AUTH-04**: User can reset password via email link

### Knowledge Base (KB)
- [ ] **KB-01**: User can upload documents (PDF, DOCX, MD, TXT) to their knowledge base
- [ ] **KB-02**: User can paste raw text or a URL as a knowledge base source
- [ ] **KB-03**: System parses uploaded files and extracts text (pdf-parse, mammoth, marked)
- [ ] **KB-04**: System chunks extracted text with heading-aware semantic chunking
- [ ] **KB-05**: System generates vector embeddings (OpenAI text-embedding-3-small) and stores in pgvector
- [ ] **KB-06**: User can browse, search, and delete documents in their KB
- [ ] **KB-07**: Document status tracking (UPLOADED -> PARSING -> EMBEDDING -> READY -> ERROR)

### Design Constraints (DC)
- [ ] **DC-01**: System validates color combinations against WCAG AA contrast ratios (4.5:1 body, 3:1 for 24pt+)
- [ ] **DC-02**: System enforces banned color pairs (red/green, yellow/white, cyan/white, blue/purple, light-gray/white, neon-green/neon-pink, red/black)
- [ ] **DC-03**: System enforces typography rules (max 2 fonts, min 24pt body, sans-serif only, banned fonts: Comic Sans, Papyrus, Bradley Hand, Curlz MT, Jokerman, Impact)
- [ ] **DC-04**: System enforces banned font pairings (two serifs, two scripts, two display, same font heading/body at similar sizes)
- [ ] **DC-05**: System enforces content density limits (max 6 bullets, max 10 words/bullet, max 80 words/slide)
- [ ] **DC-06**: System enforces layout rules (no full-bleed text without 30%+ overlay, max 2 columns, max 3 font sizes, max 3 distinct colors per slide)
- [ ] **DC-07**: System auto-splits slides that exceed density limits
- [ ] **DC-08**: Five built-in themes with pre-validated palettes and font pairings (dark, light, corporate, creative, minimal)

### Presentation Generation (PG)
- [ ] **PG-01**: User can generate a presentation by providing a topic/prompt
- [ ] **PG-02**: System retrieves relevant chunks from user's KB via RAG (pgvector similarity search)
- [ ] **PG-03**: System generates an outline first; user approves before full generation
- [ ] **PG-04**: System structures slides (1 idea/slide, proper hierarchy)
- [ ] **PG-05**: System generates speaker notes for each slide
- [ ] **PG-06**: System validates every generated slide against design constraints before persisting
- [ ] **PG-07**: User can choose slide count range (8-12 quick, 12-18 standard, 18-25 comprehensive)
- [ ] **PG-08**: User can select a theme at generation time
- [ ] **PG-09**: User can select presentation type (standard, vc-pitch, technical, executive)
- [ ] **PG-10**: Presentation CRUD (list, view, rename, duplicate, delete)

### Iteration (IT)
- [ ] **IT-01**: User can edit slide content after generation (title, body, speaker notes)
- [ ] **IT-02**: User can reorder slides
- [ ] **IT-03**: User can regenerate a single slide's content from KB
- [ ] **IT-04**: User can delete individual slides
- [ ] **IT-05**: User can add a blank slide
- [ ] **IT-06**: User can regenerate a single slide's image

### Export (EX)
- [ ] **EX-01**: User can export as editable PPTX (via PptxGenJS — NOT Marp, which produces non-editable images)
- [ ] **EX-02**: User can export as PDF (via Marp CLI)
- [ ] **EX-03**: User can export as Reveal.js HTML (single self-contained file)
- [ ] **EX-04**: User can choose export format at generation time
- [ ] **EX-05**: Exported files stored in S3-compatible storage with signed download URLs
- [ ] **EX-06**: User can share presentation via web link

### Image Generation (IG)
- [ ] **IG-01**: User can choose image count per deck: 0 (none), 3 (key slides), 6 (balanced), 12 (image-rich)
- [ ] **IG-02**: System generates images via Replicate API (FLUX.1 schnell at $0.003/image)
- [ ] **IG-03**: System generates slide-appropriate prompts based on slide type (title, problem, solution, architecture, data, CTA)
- [ ] **IG-04**: System enforces "no text, no words, no labels" in every image prompt
- [ ] **IG-05**: Images processed asynchronously via BullMQ queue with progress tracking
- [ ] **IG-06**: System maintains style consistency across images in a deck (seed/style params)
- [ ] **IG-07**: Generated images stored in S3-compatible storage

### Credits & Billing (CB)
- [ ] **CB-01**: Each user has a credit balance tracked in the database
- [ ] **CB-02**: Image generation consumes 1 credit per image
- [ ] **CB-03**: System pre-authorizes credits before starting image generation (reservation pattern)
- [ ] **CB-04**: Free tier: 3 decks/month, 0 images (text-only)
- [ ] **CB-05**: Starter tier: 10 decks/month, 30 image credits/month
- [ ] **CB-06**: Pro tier: unlimited decks, 100 image credits/month
- [ ] **CB-07**: Stripe Checkout for credit purchases (Stripe Billing Meters API)
- [ ] **CB-08**: Stripe webhook handling for payment events
- [ ] **CB-09**: Transparent credit cost display before generation starts

### Infrastructure (INF)
- [ ] **INF-01**: Docker Compose for local dev (PostgreSQL 16 + pgvector, Redis 7, MinIO)
- [ ] **INF-02**: Environment configuration via .env with validation
- [ ] **INF-03**: OpenAPI/Swagger auto-generated docs
- [ ] **INF-04**: Request validation (class-validator)
- [ ] **INF-05**: Rate limiting middleware
- [ ] **INF-06**: Structured error responses with error codes
- [ ] **INF-07**: Health check endpoints

## v2 Requirements (Deferred)

- Google Slides export via API (OAuth complexity)
- Audience-aware content adaptation (executive/technical/sales variants)
- Viewer analytics for web-shared presentations
- Multi-language support
- Notion/Confluence/Obsidian vault integrations
- Team accounts with shared knowledge bases
- Custom branding (upload logo, custom color palette)
- Google/Microsoft OAuth login

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full WYSIWYG slide editor | Multi-year effort; export to PowerPoint for fine-tuning |
| Real-time collaboration | CRDT/OT complexity; export to Google Slides for collab |
| Video/animation export | Breaks across formats |
| Custom template designer | Predefined themes sufficient for v1 |
| AI voiceover/narration | Generation focus, not delivery |
| Opaque credit deductions | Anti-pattern from Presentations.AI; always show cost before generation |
| Auto-generation without outline approval | "AI Presentation Paradox" — outline-first is mandatory |
| Native mobile app | Responsive web sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01..04 | Phase 1: Foundation | Pending |
| DC-01..08 | Phase 1: Foundation | Pending |
| INF-01..07 | Phase 1: Foundation | Pending |
| KB-01..07 | Phase 2: Knowledge Base | Pending |
| PG-01..10 | Phase 3: Presentation Engine | Pending |
| IT-01..06 | Phase 3: Presentation Engine | Pending |
| EX-01..06 | Phase 4: Export Pipeline | Pending |
| CB-01..09 | Phase 5: Credits & Billing | Pending |
| IG-01..07 | Phase 6: Image Generation | Pending |

**Coverage:**
- v1 requirements: 56 total across 9 categories
- All mapped to 6 phases
- 8 items deferred to v2
- 8 explicit exclusions

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 — enriched from research findings*
