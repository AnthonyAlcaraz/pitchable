# Pitchable

**Live at [pitch-able.ai](https://pitch-able.ai)**

AI-powered presentation platform that transforms topics and documents into consulting-grade slide decks. Chat-driven generation with real-time streaming, 16 themes, 12 story frameworks, and multi-format export.

Built with NestJS 11, React 19, Prisma 7, and Claude Sonnet 4.6.

## Quick Start (Development)

```bash
# 1. Clone and install
git clone https://github.com/AnthonyAlcaraz/pitchable.git slide-saas
cd slide-saas
pnpm install

# 2. Start Postgres + Redis
docker compose -f docker-compose.dev.yml up -d

# 3. Configure environment
cp .env.example apps/api/.env
# Edit apps/api/.env — set at minimum: ANTHROPIC_API_KEY

# 4. Database setup
cd apps/api
npx prisma db push
npx prisma generate

# 5. Build and start
npx tsc
node dist/src/main.js          # API on port 3000
cd ../web && pnpm dev           # Frontend on port 5173
```

The app works without AI keys — you just won't get AI generation features.

## Pricing Tiers

| Tier | Price | Credits | Slides/Deck | Images | Decks/Month |
|------|-------|---------|-------------|--------|-------------|
| FREE | $0 | 5 (one-time signup) | 4 (sample preview) | 0 | 2 |
| STARTER | $19/mo | 40/month | 15 | 40/month | 10 |
| PRO | $49/mo | 100/month | Unlimited | 100/month | Unlimited |
| ENTERPRISE | Custom | Custom | Unlimited | Custom | Unlimited |

**Credit costs:** Deck generation = 2 credits, Image generation = 1 credit/image, Export = free.

Free tier generates a 4-slide sample preview with an upgrade CTA. No AI images on free tier.

## Features

### Chat-Driven Generation
Describe your topic in a conversational interface. The system generates a structured outline, reviews it with an AI quality gate, then produces slides one-by-one with real-time SSE streaming. Each slide passes through content review and density validation before delivery.

### Slash Commands
| Command | Description |
|---------|-------------|
| `/outline <topic>` | Generate slide outline |
| `/regenerate [topic]` | Regenerate outline |
| `/rewrite` | Rewrite all slides with current Brief context |
| `/theme <name>` | Change theme |
| `/export <format>` | Export (pptx, pdf, html) |
| `/email [format]` | Email exported deck |
| `/images` | Generate images for all slides |
| `/auto-approve [on/off]` | Toggle slide auto-approval |
| `/config <setting> <value>` | Adjust density/image settings at runtime |
| `/help` | Show available commands |

The `/config` command supports: `bullets <2-6>`, `words <30-120>`, `rows <2-8>`, `images background|right`, `frequency <0-20>`.

### 16 Built-in Themes

| Category | Themes |
|----------|--------|
| Dark | pitchable-dark, dark-professional, creative-warm, technical-teal |
| Light | light-minimal, corporate-blue, apple-keynote, yc-startup |
| Consulting | mckinsey-executive, bcg-strategy, sequoia-capital |
| Creative | ted-talk, airbnb-story, stripe-fintech, academic-research, asc |

The **mckinsey-executive** theme triggers a distinct consulting rendering mode: white background, Georgia + Arial fonts, navy section dividers, action sentence titles (complete sentences as takeaways), horizontal-only table borders, mandatory source lines, and 5-zone vertical layout.

### 12 Story Frameworks
`HEROS_JOURNEY`, `MINTO_PYRAMID`, `RESONATE`, `PAS`, `BAB`, `STAR`, `PIXAR_PITCH`, `MCKINSEY_SCR`, `POPP`, `KAWASAKI_10_20_30`, `WHAT_SO_WHAT_NOW_WHAT`, `TALK_LIKE_TED`

Each framework defines a slide structure, target audience, and detailed generation guidance. The agentic inference system scores frameworks against knowledge base content to recommend the best narrative fit.

### Pitch Intelligence
- **Pitch Lenses** -- reusable strategy profiles controlling audience type, pitch goal, industry, company stage, tone, technical level, story framework, density limits (bullets, words, table rows), and image settings (layout, frequency)
- **Pitch Briefs** -- structured documents combining a Pitch Lens with uploaded knowledge base files as a reusable generation template
- **Agentic Inference** -- auto-detects optimal Pitch Lens settings from uploaded knowledge base documents (framework scoring, audience detection, narrative gap analysis)
- **Pitch Cockpit** -- command center with Composer Bar: select Brief + Lens + Starting From, then generate or fork

### Presentation Reuse
- **Fork with context swap** -- copy a deck's slide structure with different Brief/Lens, set as DRAFT for regeneration
- **`/rewrite` slash command** -- regenerate all slides in-place using new Brief context while preserving structure
- **Lineage tracking** -- `forkedFromId` records presentation provenance

### Public Gallery
- **Landing page** -- gradient hero, animated stats counters, feature highlights, gallery preview
- **Public gallery** -- browse community presentations with search, type filtering, and pagination
- **Presentation viewer** -- read-only slide viewer with keyboard navigation and thumbnail strip
- **"Use this template"** -- fork any public presentation into your workspace

### Knowledge Base (RAG)
Upload PDF, DOCX, TXT, or Markdown documents. Documents are chunked, embedded with OpenAI text-embedding-3-small, and stored in PostgreSQL. Hybrid retrieval combines vector similarity with keyword search for grounding slide content.

### Export Pipeline

| Format | Engine | Features |
|--------|--------|----------|
| PDF | Marp CLI | CSS themes, 6 background variants, accent color rotation, McKinsey layout |
| PPTX | PptxGenJS | Native PowerPoint, 5-zone McKinsey layout, decorative shapes, per-slide backgrounds |
| Reveal.js | HTML | Interactive web presentation with theme CSS and background variants |

All exporters share `slide-visual-theme.ts` which maps slide types to background variants (radial glow, diagonal lines, wave, grid, circuit, corner accent) with automatic light/dark palette detection. McKinsey theme gets a separate clean variant pool (white, navy divider, callout).

### Image Generation
AI images via Replicate's Nano Banana Pro model, hosted on Imgur. An image critic validates quality before inclusion. Image layout (background overlay vs right-side panel) and frequency configurable per Pitch Lens or via `/config`.

### Content Quality System
- **David Phillips Rules** -- max 6 objects/slide, one message/slide, phrases not sentences, size = importance, contrast sequencing
- **Density Validator** -- configurable limits: bullets (2-6, default 4), words (30-120, default 50), table rows (2-8, default 4), concepts (1), nested depth (1)
- **One Data Block Rule** -- each slide uses EITHER a table OR bullet list, never both
- **Content Reviewer** -- AI quality gate checking density limits, data block rule, and overall coherence
- **Color Contrast** -- WCAG AA/AAA enforcement via `ensureContrast()` with auto-adjustment to meet 7:1 ratio
- **Typography Validator** -- font whitelist (Georgia, Arial, Inter, Poppins, etc.), pairing validation, size constraints

### Programmatic API & MCP
- **REST API v1** -- full programmatic access at `/api/v1/*` with API key auth, scoped permissions, and per-key rate limiting
- **MCP Server** -- Model Context Protocol at `/mcp` for AI agents (Claude Code, Cursor) to generate, browse, fork, and export presentations
- **API Keys** -- create/revoke/rotate with granular scopes (`presentations:read`, `presentations:write`, `generation`, `export`)
- **Developer docs** -- public `/docs` page with REST reference, MCP setup, credit costs, and scope reference

### Platform
- **Auth** -- JWT access/refresh tokens, argon2 password hashing, email-based password reset
- **Billing** -- FREE/STARTER/PRO/ENTERPRISE tiers with credit-based generation and Stripe integration
- **Rate limiting** -- global throttling via NestJS ThrottlerGuard + per-key API rate limiting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript 5.9, Node.js |
| Frontend | React 19, Vite 7, Tailwind CSS 4, Zustand 5 |
| Database | PostgreSQL 17, Prisma 7 ORM |
| Queue | BullMQ + Redis 7 |
| AI | Claude Sonnet 4.6, OpenAI embeddings, Replicate Nano Banana Pro |
| Real-time | Socket.IO + SSE |
| Monorepo | Turborepo + pnpm workspaces |

### AI Model Usage

All AI calls use Claude Sonnet 4.6 (`claude-sonnet-4-6`, $3/$15 per MTok).

| Operation | Model | Approx Cost |
|-----------|-------|-------------|
| Outline generation | Sonnet 4.6 | ~$0.01 |
| Per slide content | Sonnet 4.6 | ~$0.02 |
| Content review | Sonnet 4.6 | ~$0.01/slide |
| Quality agents (3) | Sonnet 4.6 | ~$0.03 total |
| Image generation | Nano Banana Pro | ~$0.13/image |
| Document embeddings | text-embedding-3-small | ~$0.02/1M tokens |
| **Full 10-slide deck (LLM only)** | | **~$0.24** |
| **Full deck + 10 images** | | **~$1.58** |

## Project Structure

```
slide-saas/
  apps/
    api/                        NestJS backend (port 3000)
      prisma/                     Prisma schema + migrations
      src/
        analytics/                Usage analytics
        api-keys/                 API key management, guards, scopes
        api-v1/                   REST API v1 (API key auth)
        auth/                     JWT auth, guards, decorators
        billing/                  Stripe integration
        chat/                     Chat service, LLM, generation, slash commands
          prompts/                  System prompts (outline, slide-gen, content-reviewer)
        common/                   Shared decorators, filters, pipes
        config/                   App configuration
        constraints/              Density, color, layout, typography validators
        credits/                  Credit system, tier enforcement
        email/                    Resend email service
        events/                   WebSocket gateway
        exports/                  PDF/PPTX/Reveal.js export pipeline
        gallery/                  Public gallery API (no auth)
        health/                   Health checks
        images/                   AI image generation (Replicate + Imgur)
        knowledge-base/           Document upload, RAG, embedding
        mcp/                      MCP server (Streamable HTTP transport)
        pitch-brief/              Pitch Brief CRUD + KB management
        pitch-lens/               Pitch Lens CRUD + frameworks + agentic inference
          frameworks/               12 story framework configs + recommender
          prompts/                  Lens inference prompt
        presentations/            Presentation CRUD, slides, fork, duplicate
        prisma/                   Prisma service
        themes/                   Theme definitions + validation
    web/                        React frontend (port 5173)
      src/
        components/               UI components (chat, dashboard, gallery, layout, preview)
        pages/                    22 pages
        stores/                   Zustand stores (auth, presentations, pitch-brief, pitch-lens, billing, api-keys)
        lib/                      API client, utilities
  packages/
    shared/                     Shared TypeScript types
```

## Data Model

20 Prisma models, 18 enums.

```
User (1) ──> (*) Presentation ──> (*) Slide
                    │                    │
                    ├── Theme            ├── imageUrl
                    ├── PitchLens        ├── speakerNotes
                    ├── PitchBrief       └── slideType (TITLE, PROBLEM, SOLUTION, ...)
                    ├── forkedFrom (self)
                    ├── ExportJob
                    └── ChatMessage / FeedbackEntry

PitchBrief (1) ──> (*) Document ──> (*) DocumentChunk
PitchLens ──> Framework Config + Density Limits + Image Settings
User (1) ──> (*) ApiKey (scoped, argon2-hashed, rate-limited)
User (1) ──> (*) CreditTransaction
```

**Key enums:** UserTier, PresentationType, SlideType, StoryFramework, AudienceType, PitchGoal, ToneStyle, CompanyStage, TechnicalLevel, ImageLayout, ExportFormat, DocumentSourceType

## Environment Variables

See `.env.example` for a complete list with defaults. Required variables:

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_ACCESS_SECRET | JWT signing secret |
| JWT_REFRESH_SECRET | JWT refresh token secret |

Optional (app runs without these, features degrade gracefully):

| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | Claude API access (no AI generation without this) |
| OPENAI_API_KEY | Embeddings for RAG (text-embedding-3-small) |
| REPLICATE_API_TOKEN | Image generation (Nano Banana Pro) |
| IMGUR_CLIENT_ID | Image hosting |
| RESEND_API_KEY | Email delivery |
| STRIPE_SECRET_KEY | Billing integration |
| REDIS_URL | Defaults to localhost:6379 |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/profile` | Current user |

### Chat (SSE streaming)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/:presentationId/message` | Send message, receive SSE stream |
| GET | `/chat/:presentationId/messages` | Chat history |

### Presentations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/presentations` | Create from content |
| POST | `/presentations/quick-create` | Blank DRAFT with Brief/Lens |
| GET | `/presentations` | List user presentations |
| GET | `/presentations/:id` | Get with slides |
| PATCH | `/presentations/:id` | Rename |
| PATCH | `/presentations/:id/visibility` | Toggle public/private |
| POST | `/presentations/:id/duplicate` | Exact copy |
| POST | `/presentations/:id/fork` | Fork with Brief/Lens overrides |
| DELETE | `/presentations/:id` | Delete |
| PATCH | `/presentations/:id/slides/:slideId` | Edit slide |
| POST | `/presentations/:id/export` | Queue export |

### Themes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/themes` | List all 16 themes |
| GET | `/themes/:id` | Theme details with palette |

### Knowledge Base
| Method | Path | Description |
|--------|------|-------------|
| POST | `/knowledge-base/upload` | Upload document |
| GET | `/knowledge-base` | List documents |
| DELETE | `/knowledge-base/:id` | Remove document |

### Pitch Lens
| Method | Path | Description |
|--------|------|-------------|
| POST | `/pitch-lens` | Create lens with density/image config |
| GET | `/pitch-lens` | List lenses |
| GET | `/pitch-lens/:id` | Lens details |
| PUT | `/pitch-lens/:id` | Update lens |
| POST | `/pitch-lens/infer` | Auto-infer from brief (agentic) |

### Pitch Brief
| Method | Path | Description |
|--------|------|-------------|
| POST | `/pitch-brief` | Create brief |
| GET | `/pitch-brief` | List briefs |
| GET | `/pitch-brief/:id` | Brief details |

### Exports
| Method | Path | Description |
|--------|------|-------------|
| POST | `/exports/:presentationId` | Start export job |
| GET | `/exports/:jobId/download` | Download exported file |

### Gallery (public, no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gallery/presentations` | Browse public presentations |
| GET | `/gallery/presentations/:id` | View with slides |
| GET | `/gallery/lenses` | Browse public lenses |
| GET | `/gallery/stats` | Landing page counters |

### API v1 (API key auth via `x-api-key`)
| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/generate` | `generation` | Generate full deck |
| GET | `/api/v1/presentations` | `presentations:read` | List presentations |
| GET | `/api/v1/presentations/:id` | `presentations:read` | Get with slides |
| POST | `/api/v1/presentations/:id/fork` | `presentations:write` | Fork |
| DELETE | `/api/v1/presentations/:id` | `presentations:write` | Delete |
| POST | `/api/v1/presentations/:id/export` | `export` | Queue export |
| POST | `/api/v1/presentations/:id/email` | `export` | Email exported deck |
| GET | `/api/v1/exports/:jobId` | `export` | Poll export status |
| GET | `/api/v1/briefs` | `presentations:read` | List briefs |
| GET | `/api/v1/lenses` | `presentations:read` | List lenses |
| GET | `/api/v1/credits/balance` | `presentations:read` | Credit balance |

### MCP (Model Context Protocol)
Streamable HTTP at `POST /mcp`. Auth via `x-api-key`. Tools: `generate_presentation`, `list_presentations`, `get_presentation`, `fork_presentation`, `export_presentation`, `list_briefs`, `list_lenses`, `check_credits`.

## Frontend Routes

| Path | Auth | Page |
|------|------|------|
| `/` | No | Landing page |
| `/gallery` | No | Public gallery |
| `/gallery/:id` | No | Presentation viewer |
| `/docs` | No | Developer API & MCP docs |
| `/login` | No | Login |
| `/register` | No | Registration |
| `/forgot-password` | No | Password reset request |
| `/reset-password` | No | Password reset |
| `/cockpit` | Yes | Pitch Cockpit (command center) |
| `/dashboard` | Yes | Presentation list |
| `/workspace/:id` | Yes | Slide editor + chat |
| `/pitch-briefs` | Yes | Brief management |
| `/pitch-briefs/new` | Yes | Brief wizard |
| `/pitch-briefs/:id` | Yes | Brief detail |
| `/pitch-lens` | Yes | Lens management |
| `/pitch-lens/new` | Yes | Lens wizard |
| `/pitch-lens/:id` | Yes | Lens detail |
| `/billing` | Yes | Subscription & credits |
| `/analytics` | Yes | Usage analytics |
| `/settings` | Yes | Account settings |
| `/settings/api-keys` | Yes | API key management |

## Deployment

Deployed on **Railway** with Cloudflare DNS.

| Service | Provider |
|---------|----------|
| API + Frontend | Railway (auto-deploy from `main`) |
| Database | Railway PostgreSQL |
| Redis | Railway Redis |
| DNS + CDN | Cloudflare |
| Domain | pitch-able.ai |

Railway auto-deploys on push to `main`. Health check at `/health`.

```bash
# Verify deployment
curl https://pitch-able.ai/health
```

## Development

```bash
# Type check (zero errors required before any commit)
cd apps/api && npx tsc --noEmit

# Full build
pnpm build

# Start production server
cd apps/api && npm run start:prod

# Prisma studio (visual DB browser)
cd apps/api && npx prisma studio

# Schema changes
cd apps/api && npx prisma db push && npx prisma generate

# Format
pnpm format
```

## Architecture Decisions

- **David Phillips principles in prompts** -- "Death by PowerPoint" rules (max 6 objects, one message/slide, size = importance) are codified in outline and slide generation system prompts, not just documented
- **Theme-aware color contrast** -- `ensureContrast()` dynamically adjusts text colors against any background, replacing hardcoded RGBA values with palette-derived colors
- **Dual background variant pools** -- dark themes get decorative patterns (radial glow, diagonal lines, wave, grid, circuit, corner accent), light themes get clean variants (white, navy divider, callout tint)
- **Shared visual theme module** -- `slide-visual-theme.ts` centralizes background mapping for all 3 exporters (Marp, PptxGenJS, Reveal.js)
- **Configurable density pipeline** -- PitchLens density settings flow through prompts, content reviewer, and validator: `PitchLens -> buildSlideGenerationSystemPrompt(densityOverrides) -> contentReviewer(customLimits) -> validateSlideContent(customLimits)`
- **One data block rule** -- enforced in both LLM prompts and content reviewer: each slide uses EITHER a table OR bullets, never both
- **McKinsey rendering mode** -- theme name triggers complete visual override: 5-zone layout, Georgia serif, navy dividers, action sentence titles, horizontal-only table borders
- **Separate Gallery module** -- public endpoints in own NestJS module with no class-level auth guard
- **Fork vs Duplicate** -- duplicate creates exact copy (COMPLETED, preserves images); fork creates DRAFT with Brief/Lens overrides (ready for `/rewrite`)
- **MCP via Streamable HTTP** -- runs inside NestJS (not separate process), sharing services with REST API
- **Dual auth paths** -- JWT for browser sessions, API keys for programmatic access (REST + MCP), both resolve to same `RequestUser` shape
- **API key security** -- argon2-hashed, prefix-based lookup, debounced `lastUsedAt`, in-memory sliding-window rate limiting
- **Free tier sample mode** -- FREE users get 4-slide previews with upgrade CTA, no images; prevents full deck generation on free credits

## License

UNLICENSED -- Private repository.
