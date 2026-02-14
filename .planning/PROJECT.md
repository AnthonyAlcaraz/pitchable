# Pitchable

## What This Is

A chat-driven AI presentation builder that turns your knowledge base into polished slide decks through conversation. Like Lovable for code, but for designing slides. Users upload their documents, then chat with an AI co-pilot to generate, iterate, and refine presentations in real-time — seeing every change live in a split-screen preview.

Born from an internal Z4 skill that impressed colleagues enough to ask "how did you do this?"

**Repo:** https://github.com/AnthonyAlcaraz/pitchable

## Core Value

**Chat your way from knowledge base to polished deck** — upload your documents, describe what you need, and watch the AI build your presentation in real-time. Iterate through conversation: "make slide 3 more concise", "add a comparison table", "change to dark theme". Design constraints prevent ugly output automatically.

## UX Pattern (Lovable-style)

Split-screen interface:
- **Left panel**: Chat interface where users describe, iterate, and refine their deck
- **Right panel**: Live preview of the slide deck, updating in real-time as the AI makes changes
- **Iteration loop**: Describe → Generate → See live → Chat to refine → Export

Key UX principles (from Lovable + Gamma research):
- Chat-first: every action is expressible through conversation
- Real-time preview: changes appear instantly in the right panel
- Outline-first: AI shows outline for approval before full generation (prevents "AI Presentation Paradox")
- Credit transparency: cost shown before any credit-consuming action
- Slash commands in chat for power users (/theme, /export, /regenerate)

## Target Users

All professionals who build presentations regularly:
- Consultants building client deliverables from internal knowledge
- Startup founders creating pitch decks and investor updates
- Sales teams building prospect-specific presentations
- Educators creating lecture materials
- Analysts presenting research findings

## Differentiators (vs Gamma, Beautiful.ai, etc.)

1. **Knowledge Base Ingestion** — No competitor does RAG from user-uploaded documents. You present YOUR knowledge, not generic AI output.
2. **Chat-Driven Iteration** — Like Lovable for slides. Modify any aspect through natural conversation.
3. **Design Constraint Engine** — Algorithmic enforcement of design rules (WCAG contrast, banned combos, density limits). Not template constraints — generation-time constraints.
4. **Transparent Credits** — Per-image credits with cost shown before every action. No opaque deductions.

## Context

- **Prior art**: Working Z4 skill (Python) — Replicate API, Google Slides API, Marp CLI, Imgur hosting. Proven pipeline.
- **UX inspiration**: Lovable (split-screen chat + live preview), Gamma (AI Agent for slide editing, card-based slides)
- **Design research**: Banned combos (red/green, yellow/white), max 2 fonts, 1 idea/slide, max 6 bullets, WCAG AA contrast.
- **Market**: Gamma (1.9/5 Trustpilot, export quality issues), Beautiful.ai ($15/mo, good constraints), Presentations.AI ($8-15/mo, opaque billing).
- **KB gap**: Verified across 10 competitors — none offer persistent multi-document knowledge base with RAG retrieval.

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** for components
- **Zustand** for state management
- **Socket.io** for real-time preview updates
- **React-Markdown** for chat rendering

### Backend
- **NestJS 11** (TypeScript) on Fastify adapter
- **PostgreSQL 16** + **pgvector** for embeddings
- **Redis 7** for BullMQ job queues + caching
- **BullMQ** for async image generation and document processing
- **Drizzle ORM** (or Prisma 7 as fallback)

### Services
- **Replicate API** (FLUX.1 schnell) for image generation ($0.003/image)
- **OpenAI** text-embedding-3-small for KB embeddings
- **Stripe Billing Meters API** for credit-based billing
- **S3-compatible** storage (MinIO dev, S3/R2 prod)
- **PptxGenJS** for editable PPTX export
- **Marp CLI** for PDF export

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chat-driven UX over form-based | Lovable proved chat iteration is faster than UI clicks for complex creation tasks | Confirmed |
| React + Vite frontend | Industry standard, Lovable uses same stack, fast HMR | Confirmed |
| Split-screen layout | Lovable pattern: chat left, live preview right. Proven for builder tools | Confirmed |
| NestJS over FastAPI | Matches full-stack TypeScript, frontend shares types with backend | Confirmed |
| Credit-based billing | Industry standard, per-image credits with transparent cost display | Confirmed |
| Design constraint engine as Phase 1 | Ugly output is #1 trust killer (Gamma 1.9/5 Trustpilot) | Confirmed |
| PptxGenJS over Marp for PPTX | Marp PPTX = non-editable background images | Confirmed |
| pgvector over Pinecone | Stays in PostgreSQL, no separate vector DB to manage | Confirmed |
| Socket.io for real-time | Bi-directional communication for live preview updates | Confirmed |

## Requirements

### Validated

(None yet — ship to validate)

### Active

See `.planning/REQUIREMENTS.md` for full list (56+ requirements across 10 categories)

### Out of Scope

- Full WYSIWYG slide editor — chat-driven editing is the core UX
- Real-time collaboration — v2 feature
- Video/animation export — static presentations only
- Custom template designer — predefined themes only
- AI voiceover/narration — generation focus, not delivery
- Native mobile app — responsive web sufficient

---
*Last updated: 2026-02-14 — major pivot: added chat-driven frontend, Lovable-style UX, renamed to Pitchable*
