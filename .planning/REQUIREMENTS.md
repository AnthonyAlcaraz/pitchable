# Requirements: SlideForge

**Defined:** 2026-02-14
**Core Value:** Turn any knowledge base into a presentation-ready deck with one click

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and receive a JWT token for authenticated requests
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh (JWT refresh tokens)

### Knowledge Base

- [ ] **KB-01**: User can upload documents (PDF, DOCX, MD, TXT) to their knowledge base
- [ ] **KB-02**: User can paste raw text or a URL as a knowledge base source
- [ ] **KB-03**: Uploaded documents are parsed and chunked into semantic segments
- [ ] **KB-04**: Chunks are embedded with vector embeddings and stored in pgvector
- [ ] **KB-05**: User can browse, search, and delete documents in their knowledge base
- [ ] **KB-06**: When generating a deck, system retrieves relevant KB chunks via RAG

### Presentation Generation

- [ ] **GEN-01**: User can enter a topic/prompt and trigger deck generation from their KB
- [ ] **GEN-02**: System generates a slide outline first, user approves before full generation
- [ ] **GEN-03**: System structures slides automatically (1 core idea per slide, max 5 bullets per slide)
- [ ] **GEN-04**: User can select target slide count (8, 12, 16, 20)
- [ ] **GEN-05**: User can select presentation type (standard, vc-pitch, technical, executive)
- [ ] **GEN-06**: Generated slides include speaker notes derived from KB content

### Design Constraints

- [ ] **DSN-01**: System enforces forbidden color combinations (red+green, red+blue bright, orange+blue saturated, neon pairs)
- [ ] **DSN-02**: System enforces typography rules (max 2 font families, heading min 28pt, body min 18pt, nothing below 14pt)
- [ ] **DSN-03**: System enforces content density rules (max 5 bullets per slide, max 25 words per bullet, max 6 table rows)
- [ ] **DSN-04**: System enforces contrast ratio >= 4.5:1 for text on backgrounds (WCAG AA)
- [ ] **DSN-05**: System validates all constraints before export and rejects/fixes violations
- [ ] **DSN-06**: Constraint violations are reported to the user with fix suggestions

### Themes

- [ ] **THM-01**: User can select from predefined themes (dark, light, corporate-blue, corporate-green, creative, minimal)
- [ ] **THM-02**: Each theme defines color palette, font pairing, background style, and layout rules
- [ ] **THM-03**: User can customize primary/secondary colors within a theme (constrained by DSN rules)
- [ ] **THM-04**: User can upload a logo that is placed on title and closing slides

### Image Generation

- [ ] **IMG-01**: User can choose image tier per deck: 0 (none), 3 (key slides), 6 (balanced), 12 (image-rich)
- [ ] **IMG-02**: Images are generated asynchronously via Replicate API (Nano Banana Pro / FLUX.1)
- [ ] **IMG-03**: Generated images are uploaded to permanent hosting (Imgur) and URLs stored
- [ ] **IMG-04**: Image prompts are derived from slide content and themed for visual consistency
- [ ] **IMG-05**: Image generation jobs are queued via BullMQ with progress tracking
- [ ] **IMG-06**: User can regenerate individual slide images

### Export

- [ ] **EXP-01**: User can export deck as PDF
- [ ] **EXP-02**: User can export deck as PPTX (editable PowerPoint) via PptxGenJS or Marp
- [ ] **EXP-03**: User can export deck as Reveal.js HTML (self-contained, openable in browser)
- [ ] **EXP-04**: User can share deck via a web link (hosted Reveal.js viewer)
- [ ] **EXP-05**: All exports respect the selected theme and design constraints

### Credits & Billing

- [ ] **BIL-01**: Each user account has a credit balance
- [ ] **BIL-02**: Image generation consumes credits (2 credits per image)
- [ ] **BIL-03**: Credit cost is shown to user before generation (transparent pricing)
- [ ] **BIL-04**: Free tier includes 50 one-time credits
- [ ] **BIL-05**: Paid plans refill credits monthly (Starter: 200, Pro: 600)
- [ ] **BIL-06**: Stripe integration for subscription management and credit purchase

### Iteration

- [ ] **ITR-01**: User can edit slide text content after generation
- [ ] **ITR-02**: User can reorder slides via drag-and-drop
- [ ] **ITR-03**: User can regenerate a single slide (new content from KB)
- [ ] **ITR-04**: User can delete individual slides
- [ ] **ITR-05**: User can add a blank slide and write content manually

## v2 Requirements

### Google Slides Export

- **GSL-01**: User can export deck to Google Slides via API
- **GSL-02**: Google Slides export preserves all formatting and images

### Audience Adaptation

- **AUD-01**: User can select audience type (executive, technical, sales, training)
- **AUD-02**: Same KB content generates different depth/framing per audience

### Viewer Analytics

- **ANL-01**: User can see who viewed their shared web-link deck
- **ANL-02**: User can see time spent per slide by viewers
- **ANL-03**: User can see which slides got most engagement

### Advanced Auth

- **AUTH-05**: User can log in via Google OAuth
- **AUTH-06**: User can log in via Microsoft OAuth
- **AUTH-07**: Team accounts with shared knowledge base

### Multi-Language

- **LANG-01**: UI available in English, French, Spanish
- **LANG-02**: Presentations generated in user's chosen language

### Vault Integrations

- **INT-01**: Connect Obsidian vault as knowledge base source
- **INT-02**: Connect Notion workspace as knowledge base source
- **INT-03**: Connect Confluence space as knowledge base source

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full WYSIWYG slide editor | Multi-year effort to build PowerPoint clone; export to PowerPoint for fine-tuning instead |
| Real-time collaboration | Requires OT/CRDT, WebSocket infra; export to Google Slides for collab |
| Video/animation export | Breaks across formats, animation rarely translates to PPTX |
| Custom template designer | Predefined themes with customization sufficient for v1 |
| AI voiceover/narration | Focus on generation, not delivery |
| Opaque credit deductions | Anti-pattern from Presentations.AI; credits only for images, always shown before generation |
| Auto-generation without outline approval | "AI Presentation Paradox" — generates faster mediocrity; outline-first is mandatory |
| Native mobile app | Responsive web sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| KB-01 | TBD | Pending |
| KB-02 | TBD | Pending |
| KB-03 | TBD | Pending |
| KB-04 | TBD | Pending |
| KB-05 | TBD | Pending |
| KB-06 | TBD | Pending |
| GEN-01 | TBD | Pending |
| GEN-02 | TBD | Pending |
| GEN-03 | TBD | Pending |
| GEN-04 | TBD | Pending |
| GEN-05 | TBD | Pending |
| GEN-06 | TBD | Pending |
| DSN-01 | TBD | Pending |
| DSN-02 | TBD | Pending |
| DSN-03 | TBD | Pending |
| DSN-04 | TBD | Pending |
| DSN-05 | TBD | Pending |
| DSN-06 | TBD | Pending |
| THM-01 | TBD | Pending |
| THM-02 | TBD | Pending |
| THM-03 | TBD | Pending |
| THM-04 | TBD | Pending |
| IMG-01 | TBD | Pending |
| IMG-02 | TBD | Pending |
| IMG-03 | TBD | Pending |
| IMG-04 | TBD | Pending |
| IMG-05 | TBD | Pending |
| IMG-06 | TBD | Pending |
| EXP-01 | TBD | Pending |
| EXP-02 | TBD | Pending |
| EXP-03 | TBD | Pending |
| EXP-04 | TBD | Pending |
| EXP-05 | TBD | Pending |
| BIL-01 | TBD | Pending |
| BIL-02 | TBD | Pending |
| BIL-03 | TBD | Pending |
| BIL-04 | TBD | Pending |
| BIL-05 | TBD | Pending |
| BIL-06 | TBD | Pending |
| ITR-01 | TBD | Pending |
| ITR-02 | TBD | Pending |
| ITR-03 | TBD | Pending |
| ITR-04 | TBD | Pending |
| ITR-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 0
- Unmapped: 45 (awaiting roadmap)

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after initial definition*
