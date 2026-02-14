# Requirements: Pitchable

**Defined:** 2026-02-14
**Core Value:** Chat your way from knowledge base to polished deck

## v1 Requirements

### Frontend Shell (FE)
- [ ] **FE-01**: Split-screen layout — chat panel left, live slide preview right (Lovable-style)
- [ ] **FE-02**: Responsive layout that collapses to tabbed view on mobile
- [ ] **FE-03**: Landing page with product value prop, pricing tiers, and sign-up CTA
- [ ] **FE-04**: Authentication pages (sign up, log in, forgot password)
- [ ] **FE-05**: Dashboard showing user's presentations, KB documents, and credit balance
- [ ] **FE-06**: Settings page for account management and billing
- [ ] **FE-07**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui

### Chat Interface (CH)
- [ ] **CH-01**: Chat input with send button and keyboard shortcut (Enter to send, Shift+Enter for newline)
- [ ] **CH-02**: Chat history with user messages and AI responses rendered in markdown
- [ ] **CH-03**: AI responses stream in real-time (token-by-token via SSE or WebSocket)
- [ ] **CH-04**: Slash commands in chat for power users (/theme, /export, /regenerate, /images, /outline)
- [ ] **CH-05**: Chat context awareness — AI knows the current deck state and can reference specific slides
- [ ] **CH-06**: Chat can trigger actions: generate deck, modify slides, change theme, add/remove slides, export
- [ ] **CH-07**: Chat shows credit cost confirmation before expensive operations (image generation)
- [ ] **CH-08**: Chat history persisted per presentation session

### Live Preview (LP)
- [ ] **LP-01**: Real-time slide preview updates as AI modifies the deck (via Socket.io)
- [ ] **LP-02**: Slide thumbnail navigation sidebar (click to jump to any slide)
- [ ] **LP-03**: Current slide highlighted in preview, scrolls to modified slide on chat action
- [ ] **LP-04**: Slide count and deck title visible in preview header
- [ ] **LP-05**: Click-to-edit on any text element in the preview (inline editing)
- [ ] **LP-06**: Presentation mode (fullscreen slideshow) accessible from preview

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
- [ ] **PG-11**: Content Reviewer LLM agent validates each slide before rendering — enforces density (max 6 bullets, max 80 words, 1 concept/slide), auto-splits overloaded slides, returns structured JSON verdict (PASS/NEEDS_SPLIT)
- [ ] **PG-12**: Presentation Feedback Log — persistent store tracking design violations, user corrections, and codified quality rules per user. System learns from past generations to improve future output.
- [ ] **PG-13**: Automatic Human Validation Gate — every generated output (outline, slide, image) triggers a validation prompt in the chat. User accepts, edits, or rejects. Every correction is captured in the Feedback Log and fed into the next generation's system prompt as a user-specific preference.
- [ ] **PG-14**: Self-Improving Loop — generation prompts include the user's Feedback Log as context (top N most recent corrections + codified rules). Each generation is personalized to the user's demonstrated preferences, creating a compounding quality advantage over time.

### Iteration (IT)
- [ ] **IT-01**: User can edit slide content after generation (title, body, speaker notes)
- [ ] **IT-02**: User can reorder slides
- [ ] **IT-03**: User can regenerate a single slide's content from KB
- [ ] **IT-04**: User can delete individual slides
- [ ] **IT-05**: User can add a blank slide
- [ ] **IT-06**: User can regenerate a single slide's image

### Export (EX)
- [ ] **EX-01**: User can export as editable PPTX (via PptxGenJS -- NOT Marp, which produces non-editable images)
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
- [ ] **IG-08**: PaperBanana 5-agent pipeline orchestrates image generation: Retriever (reference selection) → Planner (figure layout) → Stylist (deck-wide aesthetic) → Visualizer (generation) → Critic (scoring)
- [ ] **IG-09**: VLM Critic agent scores each image on 4 dimensions: Faithfulness (>=8/10), Readability (>=8/10), Conciseness (>=7/10), Aesthetics (>=7/10). Images below threshold auto-regenerate (max 3 rounds)
- [ ] **IG-10**: Critic uses a Vision Language Model (GPT-4o or Claude) to analyze generated images — not heuristic scoring

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
| Auto-generation without outline approval | "AI Presentation Paradox" -- outline-first is mandatory |
| Native mobile app | Responsive web sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FE-01..07 | Phase 1 | Pending |
| CH-01..08 | Phase 3 | Pending |
| LP-01..06 | Phase 3 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| DC-01 | Phase 1 | Pending |
| DC-02 | Phase 1 | Pending |
| DC-03 | Phase 1 | Pending |
| DC-04 | Phase 1 | Pending |
| DC-05 | Phase 1 | Pending |
| DC-06 | Phase 1 | Pending |
| DC-07 | Phase 1 | Pending |
| DC-08 | Phase 1 | Pending |
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-04 | Phase 1 | Pending |
| INF-05 | Phase 1 | Pending |
| INF-06 | Phase 1 | Pending |
| INF-07 | Phase 1 | Pending |
| KB-01 | Phase 2 | Pending |
| KB-02 | Phase 2 | Pending |
| KB-03 | Phase 2 | Pending |
| KB-04 | Phase 2 | Pending |
| KB-05 | Phase 2 | Pending |
| KB-06 | Phase 2 | Pending |
| KB-07 | Phase 2 | Pending |
| PG-01 | Phase 3 | Pending |
| PG-02 | Phase 3 | Pending |
| PG-03 | Phase 3 | Pending |
| PG-04 | Phase 3 | Pending |
| PG-05 | Phase 3 | Pending |
| PG-06 | Phase 3 | Pending |
| PG-07 | Phase 3 | Pending |
| PG-08 | Phase 3 | Pending |
| PG-09 | Phase 3 | Pending |
| PG-10 | Phase 3 | Pending |
| IT-01 | Phase 3 | Pending |
| IT-02 | Phase 3 | Pending |
| IT-03 | Phase 3 | Pending |
| IT-04 | Phase 3 | Pending |
| IT-05 | Phase 3 | Pending |
| IT-06 | Phase 3 | Pending |
| EX-01 | Phase 4 | Pending |
| EX-02 | Phase 4 | Pending |
| EX-03 | Phase 7 | Pending |
| EX-04 | Phase 4 | Pending |
| EX-05 | Phase 4 | Pending |
| EX-06 | Phase 7 | Pending |
| IG-01 | Phase 6 | Pending |
| IG-02 | Phase 6 | Pending |
| IG-03 | Phase 6 | Pending |
| IG-04 | Phase 6 | Pending |
| IG-05 | Phase 6 | Pending |
| IG-06 | Phase 6 | Pending |
| IG-07 | Phase 6 | Pending |
| IG-08 | Phase 6 | Pending |
| IG-09 | Phase 6 | Pending |
| IG-10 | Phase 6 | Pending |
| PG-11 | Phase 3 | Pending |
| PG-12 | Phase 3 | Pending |
| PG-13 | Phase 3 | Pending |
| PG-14 | Phase 3 | Pending |
| CB-01 | Phase 5 | Pending |
| CB-02 | Phase 5 | Pending |
| CB-03 | Phase 5 | Pending |
| CB-04 | Phase 5 | Pending |
| CB-05 | Phase 5 | Pending |
| CB-06 | Phase 5 | Pending |
| CB-07 | Phase 5 | Pending |
| CB-08 | Phase 5 | Pending |
| CB-09 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 84 total across 12 categories (FE, CH, LP, AUTH, KB, DC, PG, IT, EX, IG, CB, INF)
- Mapped to phases: 84
- Unmapped: 0
- 8 items deferred to v2
- 8 explicit exclusions

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 -- added self-improving loop: PG-13 (human validation gate), PG-14 (feedback-to-prompt loop). Total: 84 requirements.*
