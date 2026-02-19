# Pitchable (slide-saas) - Claude Code Instructions

## Workflow Rules (MANDATORY)

**Every change MUST be committed and pushed immediately after verification.**

```bash
# After ANY code change:
cd ~/projects/slide-saas/apps/api && npx tsc --noEmit  # zero errors required
cd ~/projects/slide-saas && git add <changed-files>
git commit -m "type: description"
git push
```

**Commit types:** `feat`, `fix`, `refactor`, `chore`, `docs`
**Never batch changes across phases.** One commit per logical change.

## Project Structure

```
slide-saas/                  # Turborepo monorepo (pnpm)
  apps/api/                  # NestJS backend (port 3000)
  apps/web/                  # React + Vite frontend
  packages/shared/           # Shared TypeScript types
```

## Development Commands

```bash
# Build + type check
cd ~/projects/slide-saas/apps/api && npx tsc --noEmit

# Compile to dist
cd ~/projects/slide-saas/apps/api && npx tsc

# Start server (background)
cd ~/projects/slide-saas/apps/api && node dist/src/main.js

# Schema changes
cd ~/projects/slide-saas/apps/api && npx prisma db push && npx prisma generate

# Kill server by port
PID=$(netstat -ano | grep ":3000" | grep LISTEN | awk '{print $5}' | head -1)
taskkill //PID $PID //F
```

## Architecture Overview

### Backend Stack
- **NestJS** with TypeScript (ESM, `dist/src/main.js` entry)
- **Prisma** ORM with PostgreSQL + pgvector + Apache AGE
- **BullMQ** + Redis for background jobs (image generation, doc processing)
- **Socket.io** for real-time slide generation progress
- **SSE streaming** for chat responses

### AI Models
| Model | Use | Cost |
|-------|-----|------|
| Claude Opus 4.6 | Slide content generation | $5/$25/MTok |
| Claude Sonnet 4.5 | Outline, chat, modifications | $3/$15/MTok |
| Claude Haiku 4.5 | Intent classifier, content review, image critic | $0.80/$4/MTok |
| Nano Banana Pro | Image generation (Replicate) | ~$0.13/image |
| text-embedding-3-small | Document embeddings (OpenAI) | ~$0.02/1M tokens |

### Key Services
- **GenerationService** (`chat/generation.service.ts`) - Chat-driven deck generation with streaming
- **SyncGenerationService** (`api-v1/sync-generation.service.ts`) - API v1 synchronous generation
- **MarpExporterService** (`exports/marp-exporter.service.ts`) - PDF export via Marp CLI
- **NanoBananaService** (`images/nano-banana.service.ts`) - Image generation via Replicate
- **ContentReviewerService** (`chat/content-reviewer.service.ts`) - Haiku-based quality gate
- **DensityValidator** (`constraints/density-validator.ts`) - Slide content limits enforcement

### Configuration Flow
PitchLens settings flow through the generation pipeline:
```
PitchLens (DB) → generation.service.ts → buildSlideGenerationSystemPrompt()
                                       → contentReviewer.reviewSlide(customLimits)
                                       → validateSlideContent(customLimits)
```

## Test Credentials

- **User:** overflow-test@test.com / OverTest1234
- **API Key:** `pk_2b0ea28428e50a20789cfe73bc9aa04864bf1aef33f30632157471476b5d5751`
- **McKinsey theme ID:** `d4cf8da3-2654-4e5c-85f7-f09292d1b2a0`
- **Server:** localhost:3000

## Density Defaults

| Parameter | Default | Range |
|-----------|---------|-------|
| maxBulletsPerSlide | 4 | 2-6 |
| maxWordsPerSlide | 50 | 30-120 |
| maxTableRows | 4 | 2-8 |
| maxConceptsPerSlide | 1 | fixed |
| imageFrequency | 4 (1 per N slides) | 0-20 |
| imageLayout | RIGHT | BACKGROUND, RIGHT |

## Slash Commands

`/theme`, `/export`, `/email`, `/outline`, `/regenerate`, `/images`, `/rewrite`, `/config`, `/help`, `/auto-approve`

## Themes (16)

Dark: `pitchable-dark`, `dark-professional`, `creative-warm`, `technical-teal`
Light: `light-minimal`, `corporate-blue`, `apple-keynote`, `yc-startup`
Consulting: `mckinsey-executive`, `bcg-strategy`, `sequoia-capital`
Creative: `ted-talk`, `airbnb-story`, `stripe-fintech`, `academic-research`, `asc`

## Story Frameworks (12)

`HEROS_JOURNEY`, `MINTO_PYRAMID`, `RESONATE`, `PAS`, `BAB`, `STAR`, `PIXAR_PITCH`, `MCKINSEY_SCR`, `POPP`, `KAWASAKI_10_20_30`, `WHAT_SO_WHAT_NOW_WHAT`, `TALK_LIKE_TED`

## File Naming Conventions

- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- DTOs: `dto/*.dto.ts`
- Prompts: `prompts/*.prompt.ts`
- Guards: `guards/*.guard.ts`
- Modules: `*.module.ts`

## Slide Types (11)

`TITLE`, `PROBLEM`, `SOLUTION`, `ARCHITECTURE`, `PROCESS`, `COMPARISON`, `DATA_METRICS`, `CTA`, `CONTENT`, `QUOTE`, `VISUAL_HUMOR`

### VISUAL_HUMOR
- Image-forward humor slide: full-screen image + short witty title (max 8 words)
- Body is empty or a single punchline subtitle — image carries the message
- Content reviewer skips these (intentionally minimal)
- Image priority is highest (always gets an image regardless of frequency)
- Tone-gated: only for CONVERSATIONAL, BOLD, INSPIRATIONAL, STORYTELLING (max 1-2 per deck)
- Never split by slide structurer
- PPTX: full-bleed image at 80% visibility + dark gradient overlay + centered title
- Marp: `![bg brightness:0.7]` + `lead` class + no pagination

## Important Patterns

1. **Never edit `.env`** — read-only, contains secrets
2. **Schema changes** require `prisma db push` + `prisma generate` + recompile
3. **Content reviewer** accepts optional `customLimits: DensityLimits` parameter
4. **Both generation paths** must stay in sync (chat + sync API v1)
5. **Image prompts** must include "no text/words/letters" instruction
6. **McKinsey theme** triggers special CSS (white bg, navy dividers, Georgia serif)
7. **Always commit and push** after every verified change — never leave uncommitted work
