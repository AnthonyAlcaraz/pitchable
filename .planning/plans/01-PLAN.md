# Phase 1: Foundation — Execution Plan

**Goal**: Split-screen app shell running with auth, design constraints, and themes — the skeleton that everything else plugs into

**Starting Point**: Existing NestJS backend (47 files) with Prisma schema, auth (bcrypt/JWT), constraint engine, themes, credits, exports, images modules. NO frontend exists. Docker Compose has Postgres + Redis but missing pgvector and MinIO.

**ORM Decision**: Keep Prisma 7 (already implemented with full schema). Drizzle migration would waste time with no material benefit for this project.

---

## Plan 01-01: Monorepo Setup

**What**: Restructure flat NestJS project into Turborepo monorepo with `apps/api` (NestJS) and `apps/web` (React + Vite) workspaces, plus `packages/shared` for types.

**Tasks**:
1. Install pnpm globally, init Turborepo at project root
2. Create directory structure: `apps/api/`, `apps/web/`, `packages/shared/`
3. Move existing `src/`, `prisma/`, `test/`, `tsconfig*.json`, `nest-cli.json` into `apps/api/`
4. Move `docker-compose.yml`, `.env.example` to root
5. Create root `package.json` with workspaces, root `turbo.json` with build/dev/test/lint pipelines
6. Create `pnpm-workspace.yaml`
7. Scaffold `apps/web/` with `pnpm create vite@latest web --template react-ts`
8. Install Tailwind CSS + shadcn/ui in `apps/web/`
9. Create `packages/shared/` with shared TypeScript types (generated from Prisma)
10. Update all import paths in `apps/api/src/` if needed
11. Verify `pnpm dev` starts both apps concurrently
12. Verify `pnpm build` compiles both apps

**Acceptance**:
- `pnpm dev` starts NestJS on :3000 and Vite on :5173
- `pnpm build` succeeds for both apps
- Shared types importable from both apps

**Estimated complexity**: Medium (restructuring, not new code)

---

## Plan 01-02: Docker Compose + Database + Env Config

**What**: Upgrade docker-compose.yml with pgvector, MinIO, health checks. Add .env validation. Run Prisma migrations.

**Tasks**:
1. Update `docker-compose.yml`:
   - Change `postgres:16-alpine` to `ankane/pgvector:pg16` (pgvector pre-installed)
   - Add MinIO service (ports 9000/9001, console address)
   - Add health checks for all 3 services
   - Add named network
   - Rename credentials from `slideforge` to `deckpilot`
2. Create `init-db.sql` to enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Create `.env.example` with all required variables (DB, Redis, MinIO, JWT secrets, OpenAI key placeholder)
4. Add `@nestjs/config` validation schema using `Joi` or `class-validator` for env vars
5. Update Prisma schema datasource to read `DATABASE_URL` from env
6. Run `prisma db push` to verify schema applies to pgvector-enabled Postgres
7. Verify MinIO console accessible at localhost:9001

**Acceptance**:
- `docker-compose up -d` starts Postgres+pgvector, Redis 7, MinIO
- `docker-compose exec postgres psql -c "SELECT * FROM pg_extension WHERE extname='vector'"` returns a row
- MinIO console accessible at http://localhost:9001
- Prisma schema applies cleanly

**Estimated complexity**: Low

---

## Plan 01-03: JWT Auth (argon2, access/refresh tokens, guards)

**What**: Upgrade existing auth from bcrypt to argon2, add refresh token rotation, add frontend auth pages.

### Backend Tasks:
1. Replace `bcrypt` with `argon2` in package.json
2. Update `auth.service.ts`:
   - Replace `bcrypt.hash()` with `argon2.hash()`
   - Replace `bcrypt.compare()` with `argon2.verify()`
3. Add `refreshTokenHash` field to User model in Prisma schema
4. Implement refresh token generation (7d expiry) alongside access token (15m expiry)
5. Add `RefreshTokenStrategy` (passport-jwt, extracts from Authorization header)
6. Add `POST /auth/refresh` endpoint for token rotation
7. Update `POST /auth/logout` to clear refreshTokenHash
8. Add `POST /auth/signup` DTO validation (email format, password min 8 chars)
9. Add structured error responses for auth failures (401, 403, 409 email exists)

### Frontend Tasks:
10. Create `apps/web/src/pages/Login.tsx` with email/password form (shadcn/ui)
11. Create `apps/web/src/pages/Register.tsx` with name/email/password form
12. Create `apps/web/src/lib/api.ts` — axios instance with interceptors for token refresh
13. Create `apps/web/src/stores/auth.ts` — Zustand store for user state + tokens
14. Add `ProtectedRoute` component that redirects to /login if not authenticated
15. Add React Router with public (/login, /register) and protected (/) routes

**Acceptance**:
- User can register via frontend form → receives access + refresh tokens
- User can log in → sees dashboard (empty placeholder)
- Access token expires after 15m → refresh endpoint returns new pair
- Invalid credentials return structured error (not 500)
- `argon2.verify()` used for password validation (not bcrypt)

**Estimated complexity**: Medium

---

## Plan 01-04: Design Constraint Engine

**What**: Extend existing constraint validators to match full banned pairs list from research. Add API endpoint for programmatic validation.

**Tasks**:
1. Update `color-validator.ts`:
   - Add ALL banned pairs from research: red/green, green/red, red/black, yellow/white, light-gray/white, cyan/white, blue/purple, neon-green/neon-pink
   - Implement proper WCAG AA contrast ratio (4.5:1 body, 3:1 for 24pt+) using W3C relative luminance formula
   - Add `validateBannedPairs()` that checks both directions
2. Update `density-validator.ts`:
   - Change max bullets from 5 to 6 (per requirements DC-05)
   - Add max 10 words per bullet rule
   - Add max 80 words per slide rule
   - Improve `suggestSplit()` to produce valid slide objects
3. Update `typography-validator.ts`:
   - Update banned fonts list: Comic Sans MS, Papyrus, Bradley Hand, Curlz MT, Jokerman, Impact
   - Add banned font pairing rules (two serifs, two scripts, two display, same font heading/body at similar sizes)
   - Enforce min 24pt body (not 18pt as currently)
   - Enforce max 2 fonts per deck (not 3)
4. Add `layout-validator.ts`:
   - No full-bleed text without 30%+ overlay
   - Max 2 columns
   - Max 3 font sizes per slide
   - Max 3 distinct colors per slide
5. Update `constraints.service.ts` to include layout validation
6. Add `POST /api/constraints/validate` endpoint that accepts slide JSON and returns violations
7. Add auto-split logic for slides exceeding density limits (DC-07)

**Acceptance**:
- `POST /api/constraints/validate` with red text on green background → returns violation with "red/green banned pair"
- Submit slide with 7 bullets → returns density violation
- Submit slide with Comic Sans → returns typography violation
- Submit valid slide → returns `{ valid: true, violations: [] }`
- Auto-split: submit slide with 10 bullets → returns 2 slides with ≤6 bullets each

**Estimated complexity**: Medium (extending existing code)

---

## Plan 01-05: Theme System

**What**: Validate 5 built-in themes against constraint engine, add API for theme listing and selection.

**Tasks**:
1. Review existing 5 themes in `themes.service.ts` against full constraint rules:
   - Verify all color pairs pass WCAG AA contrast
   - Verify font pairings are valid (not same category)
   - Verify no banned fonts used
2. Update theme definitions if any fail validation:
   - dark-professional, light-minimal, corporate-blue, creative-warm, technical-teal
3. Add `validateTheme()` method to `ConstraintsService` that checks a theme's full palette
4. Add theme seed migration — `onModuleInit()` in ThemesService seeds built-in themes
5. Ensure `GET /api/themes` returns all 5 themes with validated palettes
6. Ensure `GET /api/themes/:id` returns single theme with font and color details
7. Add `colorPalette` JSON structure to each theme: `{ background, text, heading, accent, muted, border }`

**Acceptance**:
- `GET /api/themes` returns 5 themes, each with complete palette and font info
- Every theme passes `validateTheme()` with zero violations
- Theme palettes include enough colors for full slide rendering

**Estimated complexity**: Low

---

## Plan 01-06: Frontend Shell + Infrastructure

**What**: Build split-screen layout, dashboard, settings page. Add Swagger, rate limiting, health checks, structured errors to backend.

### Backend Infrastructure:
1. Switch from Express to Fastify adapter:
   - Install `@nestjs/platform-fastify`
   - Update `main.ts` bootstrap to use `FastifyAdapter`
   - Update CORS config
2. Add Swagger:
   - Install `@nestjs/swagger`
   - Configure `DocumentBuilder` with DeckPilot API title, version, bearer auth
   - Mount at `/api/docs`
3. Add rate limiting:
   - Install `@nestjs/throttler`
   - Configure global rate limit (100 req/min default)
   - Lower limit on auth endpoints (10 req/min)
4. Add health check:
   - Install `@nestjs/terminus`
   - Add `GET /api/health` checking DB and Redis connectivity
5. Add global exception filter for structured error responses:
   - `{ statusCode, error, message, timestamp, path }`
6. Add `ValidationPipe` globally for DTO validation
7. Add API prefix `/api` to all routes

### Frontend Shell:
8. Install dependencies: `react-router-dom`, `zustand`, `axios`, `lucide-react`
9. Create layout components:
   - `AppLayout.tsx` — full-height split-screen with resizable panels
   - `ChatPanel.tsx` — left panel (placeholder "Chat coming in Phase 3")
   - `PreviewPanel.tsx` — right panel (placeholder "Preview coming in Phase 3")
   - `Sidebar.tsx` — collapsible sidebar with navigation
10. Create pages:
    - `Dashboard.tsx` — shows user's presentations list (empty state with CTA)
    - `Settings.tsx` — account info, placeholder for billing
    - `PresentationView.tsx` — split-screen layout for a single presentation
11. Create shared components:
    - `Header.tsx` — app name, user avatar, credit balance placeholder
    - `EmptyState.tsx` — reusable empty state with icon + message + CTA
12. Add React Router setup:
    - `/` → Dashboard (protected)
    - `/login` → Login page
    - `/register` → Register page
    - `/settings` → Settings (protected)
    - `/presentation/:id` → Split-screen view (protected)
13. Configure Vite proxy to forward `/api` requests to NestJS backend
14. Verify frontend ↔ backend communication (register → see dashboard)

**Acceptance**:
- User sees split-screen layout at `/presentation/:id` — empty chat left, empty preview right
- User can sign up, log in, and see dashboard with empty presentations list
- `GET /api/docs` shows Swagger UI with all endpoints documented
- `GET /api/health` returns `{ status: "ok", database: "up", redis: "up" }`
- Rate limiting blocks >100 requests/min
- All API errors return structured JSON (not HTML/text)
- Frontend and backend communicate via API proxy

**Estimated complexity**: High (most tasks in this plan)

---

## Execution Order

Plans are executed sequentially with dependencies:

```
01-01 (Monorepo)
  ↓
01-02 (Docker + DB)
  ↓
01-03 (Auth) ←─── needs DB running
  ↓
01-04 (Constraints) ←─── independent but builds on scaffold
  ↓
01-05 (Themes) ←─── needs constraints for validation
  ↓
01-06 (Frontend Shell + Infra) ←─── needs auth + themes APIs
```

**Parallelization**: 01-04 and 01-05 could run in parallel after 01-03, but themes depend on constraints for validation, so sequential is safer.

## Phase 1 Success Criteria Verification

After all 6 plans complete, verify:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Split-screen layout visible | Navigate to `/presentation/test` — see chat left, preview right |
| 2 | Auth flow works end-to-end | Register → login → see dashboard → logout |
| 3 | Constraint engine rejects violations | `POST /api/constraints/validate` with red/green, >6 bullets, Comic Sans |
| 4 | 5 themes available via API | `GET /api/themes` returns 5 validated themes |
| 5 | Docker Compose works | `docker-compose up -d` starts PG+pgvector, Redis, MinIO |
| 6 | Swagger accessible | Navigate to `/api/docs` |
| 7 | Frontend ↔ backend communication | Register via frontend, token stored, dashboard loads |
