# Phase 8: MCP Server + Programmatic API + API Keys

## Goal
Expose Pitchable's generation pipeline as both an **MCP server** (for AI agents in Claude Code, Cursor, etc.) and a **REST API** (for traditional integrations). Both authenticate via **API keys** with per-key scopes, rate limiting, and credit tracking.

## Architecture

```
AI Agent (Claude Code, Cursor, etc.)
    ↓ MCP protocol (Streamable HTTP)
    ↓
NestJS App
    ├── /mcp/* → McpModule (Streamable HTTP transport)
    ├── /api/v1/* → ApiV1Module (REST endpoints)
    └── Both use → ApiKeyGuard → same services
```

**Key insight**: MCP and REST share the same underlying services. The MCP module wraps them as MCP tools/resources. The API v1 module wraps them as REST endpoints. Both authenticate via `x-api-key` header.

---

## Steps

### Step 1: Schema — ApiKey + MCP_GENERATION credit reason
**File:** `apps/api/prisma/schema.prisma`

Add `ApiKey` model:
```prisma
model ApiKey {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  name        String                          // "My Agent Key"
  keyHash     String    @unique               // argon2 hash
  keyPrefix   String                          // "pk_a1b2c3d4" (first 11 chars for lookup)
  scopes      String[]                        // ['presentations:read', 'presentations:write', 'generation', 'export']
  rateLimit   Int       @default(60)          // requests per minute
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isRevoked   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([keyPrefix])
  @@index([userId])
}
```

Add relation to User: `apiKeys ApiKey[]`

Add to CreditReason enum: `API_GENERATION`

Run `prisma generate`.

---

### Step 2: API Key Service + Guard
**Files:**
- `apps/api/src/api-keys/api-keys.module.ts`
- `apps/api/src/api-keys/api-keys.service.ts`
- `apps/api/src/api-keys/api-keys.controller.ts`
- `apps/api/src/api-keys/guards/api-key.guard.ts`
- `apps/api/src/api-keys/decorators/require-scopes.decorator.ts`
- `apps/api/src/api-keys/dto/create-api-key.dto.ts`

**ApiKeysService:**
- `create(userId, name, scopes, expiresAt?)` → generates `pk_` + 32 random hex chars, stores argon2 hash, returns plaintext key ONCE
- `verify(rawKey)` → lookup by prefix, argon2 verify, check revoked/expired, return user + scopes
- `list(userId)` → returns keys with prefix, name, scopes, lastUsedAt (never the hash)
- `revoke(userId, keyId)` → sets isRevoked = true
- `rotateKey(userId, keyId)` → revoke old, create new with same scopes

**ApiKeyGuard (CanActivate):**
1. Extract `x-api-key` header (or `Authorization: Bearer pk_...`)
2. Call `verify()` — attach `RequestUser` to request
3. Check rate limit (in-memory sliding window per key ID, backed by Redis if available)
4. Update `lastUsedAt` (debounced — every 60s max, not every request)
5. Reject if revoked, expired, or rate-limited

**RequireScopes decorator:**
- `@RequireScopes('presentations:write', 'generation')` — checks `apiKey.scopes` includes all required
- Guard reads metadata via Reflector

**ApiKeysController (JWT-protected — key management from the UI):**
- `POST /api-keys` — create key, return plaintext once
- `GET /api-keys` — list user's keys
- `DELETE /api-keys/:id` — revoke key
- `POST /api-keys/:id/rotate` — rotate key

Register in `app.module.ts`.

---

### Step 3: REST API v1 Module
**Files:**
- `apps/api/src/api-v1/api-v1.module.ts`
- `apps/api/src/api-v1/api-v1.controller.ts`

All endpoints use `ApiKeyGuard` (not JwtAuthGuard). All under `/api/v1/`.

**Endpoints:**

**Presentations:**
- `GET /api/v1/presentations` — list user's presentations
  - Scope: `presentations:read`
- `GET /api/v1/presentations/:id` — get presentation with slides
  - Scope: `presentations:read`
- `POST /api/v1/presentations` — create blank presentation
  - Scope: `presentations:write`
- `DELETE /api/v1/presentations/:id` — delete
  - Scope: `presentations:write`
- `POST /api/v1/presentations/:id/fork` — fork with context swap
  - Scope: `presentations:write`

**Generation (synchronous — blocks until complete):**
- `POST /api/v1/generate` — generate full presentation end-to-end
  - Scope: `generation`
  - Body: `{ topic, presentationType?, briefId?, pitchLensId?, themeId? }`
  - Returns: complete presentation with slides
  - Deducts DECK_GENERATION_COST credits
  - This calls GenerationService internally but runs outline+approval+execution in one shot (no chat loop)

**Export:**
- `POST /api/v1/presentations/:id/export` — queue export
  - Scope: `export`
  - Body: `{ format: 'PPTX' | 'PDF' | 'REVEAL_JS' }`
  - Returns: `{ jobId }`
- `GET /api/v1/exports/:jobId` — poll export status + download URL
  - Scope: `export`

**Briefs & Lenses (read-only for now):**
- `GET /api/v1/briefs` — list user's briefs
  - Scope: `presentations:read`
- `GET /api/v1/lenses` — list user's lenses
  - Scope: `presentations:read`

**Credits:**
- `GET /api/v1/credits/balance` — current balance
  - Scope: `presentations:read`

Register in `app.module.ts`. Add `/api/v1` proxy to vite config.

---

### Step 4: Synchronous Generation Service
**File:** `apps/api/src/api-v1/sync-generation.service.ts`

The existing `GenerationService` is designed for streaming WebSocket interaction (chat loop with outline approval). The API needs a **synchronous** wrapper that:

1. Creates a DRAFT presentation (via `presentationsService.quickCreate`)
2. Generates outline (calls `llm.completeJson` directly — same prompts)
3. Auto-approves the outline (no chat loop)
4. Generates all slides sequentially (same slide generation logic)
5. Runs content review
6. Sets status to COMPLETED
7. Deducts credits
8. Returns the full presentation with all slides

This reuses the same LLM prompts, context builder, and constraints — just without the streaming/chat wrapper.

---

### Step 5: MCP Server Module
**Files:**
- `apps/api/src/mcp/mcp.module.ts`
- `apps/api/src/mcp/mcp.controller.ts` (Streamable HTTP transport)
- `apps/api/src/mcp/mcp.service.ts` (MCP server setup)
- `apps/api/src/mcp/tools/generate-presentation.tool.ts`
- `apps/api/src/mcp/tools/list-presentations.tool.ts`
- `apps/api/src/mcp/tools/get-presentation.tool.ts`
- `apps/api/src/mcp/tools/fork-presentation.tool.ts`
- `apps/api/src/mcp/tools/export-presentation.tool.ts`
- `apps/api/src/mcp/tools/list-briefs.tool.ts`
- `apps/api/src/mcp/tools/list-lenses.tool.ts`
- `apps/api/src/mcp/tools/check-credits.tool.ts`
- `apps/api/src/mcp/resources/` (presentation resources)

**Dependency:** `@modelcontextprotocol/sdk` + `zod`

**Transport:** Streamable HTTP at `POST /mcp` + `GET /mcp/sse` (for SSE fallback). Auth via `x-api-key` header in initial request.

**McpService:**
- Creates `McpServer` instance with tool definitions
- Each tool wraps the same services used by REST API v1
- Tools use zod schemas for input validation (MCP SDK requirement)

**MCP Tools:**

| Tool | Description | Input | Credits |
|------|-------------|-------|---------|
| `generate_presentation` | Generate a full narrative deck from topic | `{ topic, type?, briefId?, lensId?, themeId? }` | 3 |
| `list_presentations` | List your presentations | `{ status?, limit? }` | 0 |
| `get_presentation` | Get presentation with all slides | `{ presentationId }` | 0 |
| `fork_presentation` | Fork with optional Brief/Lens swap | `{ presentationId, briefId?, lensId?, title? }` | 0 |
| `export_presentation` | Export to PPTX/PDF/HTML | `{ presentationId, format }` | 0 |
| `list_briefs` | List your Pitch Briefs | `{}` | 0 |
| `list_lenses` | List your Pitch Lenses | `{}` | 0 |
| `check_credits` | Check credit balance | `{}` | 0 |

**MCP Resources:**
- `pitchable://presentations` — list of presentations
- `pitchable://presentations/{id}` — full presentation with slides

Register in `app.module.ts`.

---

### Step 6: Frontend — API Keys Management Page
**Files:**
- `apps/web/src/pages/ApiKeysPage.tsx`
- `apps/web/src/stores/api-keys.store.ts`

**ApiKeysPage** (new page under Settings):
- Table of existing keys: name, prefix (`pk_a1b2...`), scopes as badges, created date, last used
- "Create API Key" button → modal with:
  - Name input
  - Scope checkboxes (presentations:read, presentations:write, generation, export)
  - Optional expiry date picker
  - On create → show plaintext key ONCE with copy button + warning "Save this key. You won't see it again."
- Revoke button (with confirmation)
- Rotate button (revokes old, shows new key)

**Store pattern** matches existing Zustand stores:
```typescript
interface ApiKeysState {
  keys: ApiKeyListItem[];
  isLoading: boolean;
  loadKeys: () => Promise<void>;
  createKey: (name: string, scopes: string[]) => Promise<string>; // returns plaintext
  revokeKey: (id: string) => Promise<void>;
  rotateKey: (id: string) => Promise<string>; // returns new plaintext
}
```

---

### Step 7: Frontend — Settings Page Update + Route
**Files:**
- `apps/web/src/pages/SettingsPage.tsx` — add "API Keys" section with link
- `apps/web/src/App.tsx` — add `/settings/api-keys` route

Add a new section to SettingsPage between Credits and Security:
```tsx
<section>
  <Key icon /> API Keys
  <p>Manage API keys for programmatic access and MCP integration.</p>
  <Link to="/settings/api-keys">Manage API Keys →</Link>
</section>
```

Add lazy import and route for ApiKeysPage.

---

### Step 8: Frontend — Developer Docs Page
**Files:**
- `apps/web/src/pages/DocsPage.tsx`

A public page at `/docs` showing:
- REST API reference with endpoint table, auth header example, curl examples
- MCP setup instructions (Claude Code config snippet, Cursor config snippet)
- Credit costs table
- Rate limits per tier
- Scope reference

Static content — no backend needed. Styled consistently with landing page.

Add route to `App.tsx` as public route.

---

### Step 9: Rate Limiting per API Key
**File:** `apps/api/src/api-keys/guards/api-key-throttle.guard.ts`

Per-key rate limiting using in-memory sliding window:
- Default: 60 req/min (stored on ApiKey model)
- Tier overrides: FREE=20/min, STARTER=60/min, PRO=120/min, ENTERPRISE=300/min
- Returns `429 Too Many Requests` with `Retry-After` header
- Header: `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset`

Applied to both `/api/v1/*` and `/mcp` routes.

---

### Step 10: Verification
- `tsc --noEmit` on both api and web
- `vite build` for frontend
- Manual curl test: create key → generate presentation → export

---

## Scopes Reference

| Scope | Allows |
|-------|--------|
| `presentations:read` | List/get presentations, briefs, lenses, credits |
| `presentations:write` | Create, delete, fork presentations |
| `generation` | Generate presentations (costs credits) |
| `export` | Export presentations to PPTX/PDF/HTML |

---

## MCP Config Snippets (for docs page)

**Claude Code (`.claude/mcp.json`):**
```json
{
  "mcpServers": {
    "pitchable": {
      "type": "streamable-http",
      "url": "https://app.pitchable.ai/mcp",
      "headers": {
        "x-api-key": "pk_your_key_here"
      }
    }
  }
}
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "pitchable": {
      "url": "https://app.pitchable.ai/mcp",
      "transport": "streamable-http",
      "headers": {
        "x-api-key": "pk_your_key_here"
      }
    }
  }
}
```
