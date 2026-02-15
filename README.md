# Pitchable

AI-powered presentation builder that turns knowledge into pitch-perfect narrative slide decks. Built with NestJS 11, React 19, Prisma 7, and Claude Opus 4.6.

## Features

### Core
- **Chat-driven generation** -- describe your topic, get a structured outline, approve it, and watch slides generate one-by-one with real-time streaming via WebSockets
- **Slide editor** -- inline editing of titles, body content, and speaker notes with live preview
- **Theme system** -- pre-built themes with customizable color palettes, fonts, and styles
- **Multi-format export** -- PPTX, PDF, and Reveal.js HTML via BullMQ background jobs with S3 storage
- **AI image generation** -- contextual slide images generated per-slide with regeneration support

### Pitch Intelligence
- **Pitch Briefs** -- curated knowledge collections backed by EdgeQuake knowledge graphs (Apache AGE + pgvector). Each brief gets its own isolated graph workspace with auto entity extraction
- **Pitch Lenses** -- reusable strategy profiles (audience type, pitch goal, tone, storytelling framework). Frameworks include Problem-Solution, Situation-Complication-Resolution, AIDA, and more
- **Pitch Cockpit** -- command center with Composer Bar: select Brief + Lens + Starting From, then generate or fork

### Presentation Reuse
- **Fork with context swap** -- copy a deck's slide structure with different Brief/Lens, set as DRAFT for regeneration
- **`/rewrite` slash command** -- regenerate all slides in-place using new Brief context while preserving structure
- **Lineage tracking** -- `forkedFromId` records presentation provenance across forks and duplicates

### Public Gallery
- **Landing page** -- gradient hero, animated stats counters, feature highlights, gallery preview
- **Public gallery** -- browse community presentations with search, type filtering, and pagination
- **Presentation viewer** -- read-only slide viewer with keyboard navigation and thumbnail strip
- **"Use this template"** -- fork any public presentation into your workspace with one click
- **Visibility toggle** -- share completed presentations to the gallery or keep them private

### Programmatic API & MCP
- **REST API v1** -- full programmatic access at `/api/v1/*` with API key auth, scoped permissions, and per-key rate limiting
- **MCP Server** -- Model Context Protocol server at `/mcp` for AI agents (Claude Code, Cursor, Windsurf) to generate, browse, fork, and export presentations natively
- **API Keys** -- create/revoke/rotate API keys with granular scopes (`presentations:read`, `presentations:write`, `generation`, `export`)
- **Developer docs** -- public `/docs` page with REST reference, MCP setup snippets, credit costs, and scope reference

### Platform
- **Auth system** -- JWT access/refresh tokens, argon2 password hashing, email-based password reset
- **Tiered billing** -- FREE/STARTER/PRO/ENTERPRISE plans with credit-based generation, deck limits, and Stripe integration
- **Content review** -- AI-powered slide quality checks with auto-split for dense slides
- **Validation gate** -- approve/reject generated slides individually, or enable auto-approve mode
- **Rate limiting** -- global throttling (short/medium/long windows) via NestJS ThrottlerGuard + per-key API rate limiting
- **Knowledge base** -- document upload with RAG retrieval for context-aware generation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, TypeScript 5.9, Node.js |
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS 4 |
| **Database** | PostgreSQL 16 (pgvector), Prisma 7 ORM |
| **Graph DB** | EdgeQuake (Rust) -- Apache AGE + pgvector on Postgres |
| **State** | Zustand 5 |
| **Queue** | BullMQ + Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **AI** | Claude Opus 4.6 (Anthropic SDK) |
| **Real-time** | Socket.IO (WebSocket gateway) |
| **Icons** | Lucide React |
| **Monorepo** | Turborepo + pnpm workspaces |

## Project Structure

```
slide-saas/
  apps/
    api/                    # NestJS backend
      prisma/               #   Prisma schema + migrations
      src/
        auth/               #   JWT auth, guards, decorators
        billing/            #   Stripe integration
        chat/               #   Chat service, LLM, generation, slash commands
        constraints/        #   Slide density validation
        credits/            #   Credit system, tier enforcement
        events/             #   WebSocket gateway
        exports/            #   PPTX/PDF/Reveal.js export pipeline
        gallery/            #   Public gallery API (no auth)
        api-keys/           #   API key management, guards, scopes
        api-v1/             #   REST API v1 (API key auth)
        mcp/                #   MCP server (Streamable HTTP transport)
        health/             #   Health checks
        images/             #   AI image generation
        knowledge-base/     #   Document upload, RAG, EdgeQuake integration
        pitch-brief/        #   Pitch Brief CRUD + graph management
        pitch-lens/         #   Pitch Lens CRUD + frameworks
        presentations/      #   Presentation CRUD, slides, fork, duplicate
    web/                    # React frontend
      src/
        components/
          auth/             #   ProtectedRoute
          chat/             #   ChatPanel, MessageBubble
          dashboard/        #   PresentationCard, PresentationGrid, ForkDialog
          gallery/          #   GalleryNav, GalleryCard, Pagination
          layout/           #   AppLayout (sidebar + outlet)
          preview/          #   SlideRenderer
        pages/              #   21 pages (Landing, Gallery, Cockpit, Dashboard, API Keys, Docs, etc.)
        stores/             #   Zustand stores (auth, presentations, pitch-brief, pitch-lens, billing, api-keys)
        lib/                #   API client, utilities
  packages/
    shared/                 # Shared types (if needed)
  docker-compose.yml        # Postgres, Redis, MinIO, EdgeQuake
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker & Docker Compose

### Setup

```bash
# Clone and install
git clone <repo-url> slide-saas
cd slide-saas
pnpm install

# Start infrastructure
docker compose up -d

# Configure environment
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, etc.

# Run database migrations
cd apps/api && npx prisma migrate dev

# Start development
pnpm dev
```

This starts:
- **API** at `http://localhost:3000`
- **Web** at `http://localhost:5173` (proxied to API)
- **PostgreSQL** at `localhost:5432`
- **Redis** at `localhost:6379`
- **MinIO** at `localhost:9000` (console: `localhost:9001`)
- **EdgeQuake** at `localhost:8080`

## API Endpoints

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gallery/presentations` | Browse public presentations |
| GET | `/gallery/presentations/:id` | View public presentation with slides |
| GET | `/gallery/lenses` | Browse public pitch lenses |
| GET | `/gallery/stats` | Landing page counters |

### Programmatic API v1 (API key auth via `x-api-key` header)
| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/generate` | `generation` | Generate full deck (3 credits) |
| GET | `/api/v1/presentations` | `presentations:read` | List presentations |
| GET | `/api/v1/presentations/:id` | `presentations:read` | Get presentation with slides |
| POST | `/api/v1/presentations/:id/fork` | `presentations:write` | Fork with context swap |
| DELETE | `/api/v1/presentations/:id` | `presentations:write` | Delete |
| POST | `/api/v1/presentations/:id/export` | `export` | Queue export |
| GET | `/api/v1/exports/:jobId` | `export` | Poll export status |
| GET | `/api/v1/briefs` | `presentations:read` | List Pitch Briefs |
| GET | `/api/v1/lenses` | `presentations:read` | List Pitch Lenses |
| GET | `/api/v1/credits/balance` | `presentations:read` | Check credit balance |

### MCP (Model Context Protocol)
Streamable HTTP at `POST /mcp`. Auth via `x-api-key` header. Tools: `generate_presentation`, `list_presentations`, `get_presentation`, `fork_presentation`, `export_presentation`, `list_briefs`, `list_lenses`, `check_credits`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |

### Presentations (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/presentations` | List user's presentations |
| POST | `/presentations` | Create from raw content |
| POST | `/presentations/quick-create` | Blank DRAFT with Brief/Lens |
| GET | `/presentations/:id` | Get with slides |
| PATCH | `/presentations/:id` | Rename |
| PATCH | `/presentations/:id/visibility` | Toggle public/private |
| POST | `/presentations/:id/duplicate` | Exact copy |
| POST | `/presentations/:id/fork` | Fork with Brief/Lens overrides |
| DELETE | `/presentations/:id` | Delete |
| PATCH | `/presentations/:id/slides/:slideId` | Edit slide |
| POST | `/presentations/:id/export` | Queue export |

### Chat (WebSocket + REST)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/:presentationId/message` | Send message (SSE stream) |
| GET | `/chat/:presentationId/messages` | Get message history |

### Slash Commands
| Command | Description |
|---------|-------------|
| `/outline <topic>` | Generate slide outline |
| `/regenerate [topic]` | Regenerate outline |
| `/rewrite` | Rewrite all slides with current Brief context |
| `/theme <name>` | Change theme |
| `/export <format>` | Export (pptx, pdf, html) |
| `/images` | Generate images for all slides |
| `/auto-approve [on/off]` | Toggle slide auto-approval |
| `/help` | Show available commands |

## Data Model

```
User (1) ──> (*) Presentation ──> (*) Slide
                    │                    │
                    ├── Theme            ├── imageUrl
                    ├── PitchLens        ├── speakerNotes
                    ├── PitchBrief       └── slideType (TITLE, PROBLEM, SOLUTION, ...)
                    ├── forkedFrom (self)
                    ├── ExportJob ──> S3
                    └── ChatMessage

PitchBrief (1) ──> (*) Document
                    │
                    └── EdgeQuake Workspace (graph + vectors)

PitchLens ──> Framework Config (AIDA, Problem-Solution, SCR, ...)

User (1) ──> (*) ApiKey (scopes, rate limit, argon2-hashed)
```

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | No | Landing page |
| `/gallery` | No | Public gallery |
| `/gallery/:id` | No | Public presentation viewer |
| `/docs` | No | Developer API & MCP docs |
| `/login` | No | Login |
| `/register` | No | Registration |
| `/cockpit` | Yes | Pitch Cockpit (command center) |
| `/dashboard` | Yes | Presentation list |
| `/workspace/:id` | Yes | Slide editor + chat |
| `/pitch-briefs` | Yes | Brief management |
| `/pitch-lens` | Yes | Lens management |
| `/billing` | Yes | Subscription & credits |
| `/settings` | Yes | Account settings |
| `/settings/api-keys` | Yes | API key management |

## Development

```bash
# Type check
cd apps/api && pnpm exec tsc --noEmit
cd apps/web && pnpm exec tsc --noEmit

# Build
pnpm build

# Prisma
cd apps/api && npx prisma studio    # Visual DB browser
cd apps/api && npx prisma generate  # Regenerate client after schema changes

# Format
pnpm format
```

## Architecture Decisions

- **Separate Gallery module** -- public endpoints live in their own NestJS module with no class-level auth guard, cleanly separated from authenticated controllers
- **Plain `fetch()` for public pages** -- gallery pages use native fetch instead of the ApiClient (which auto-attaches JWT headers and handles 401 redirects)
- **EdgeQuake per Brief** -- each Pitch Brief gets its own isolated knowledge graph workspace, preventing cross-contamination between different pitch contexts
- **Fork vs Duplicate** -- duplicate creates an exact copy (COMPLETED status, preserves images). Fork creates a DRAFT with optional Brief/Lens overrides (ready for `/rewrite` regeneration)
- **Zustand over Redux** -- lightweight stores with direct mutations, no boilerplate. Each domain gets its own store file
- **Code-splitting** -- every page is `React.lazy()` loaded, keeping the initial bundle under 230 kB (gzipped: 72 kB)
- **MCP via Streamable HTTP** -- MCP server runs inside the NestJS app (not a separate process), sharing services with the REST API. API key auth on the transport layer
- **Dual auth paths** -- JWT for browser sessions (ApiClient auto-attaches tokens), API keys for programmatic access (REST + MCP). Both resolve to the same `RequestUser` shape
- **API key security** -- argon2-hashed keys, prefix-based lookup (never full-table scan), debounced `lastUsedAt` updates, in-memory sliding-window rate limiting per key

## License

UNLICENSED -- Private repository.
