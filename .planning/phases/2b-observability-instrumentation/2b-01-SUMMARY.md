# Phase 2B Plan 01: Observability Instrumentation Summary

**One-liner:** Instrumented 8 core services with fire-and-forget activity tracking and LLM generation metrics using completeJsonWithUsage

## Execution

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Instrument auth.service.ts | 3f021af | apps/api/src/auth/auth.service.ts |
| 2 | Instrument billing.service.ts | c8e93cb | apps/api/src/billing/billing.service.ts |
| 3 | Instrument api-keys.service.ts | 25061fe | apps/api/src/api-keys/api-keys.service.ts |
| 4 | Instrument presentations.service.ts | 3b8d678 | apps/api/src/presentations/presentations.service.ts |
| 5 | Instrument knowledge-base.service.ts | d9755da | apps/api/src/knowledge-base/knowledge-base.service.ts |
| 6 | Instrument generation.service.ts | 33ac591 | apps/api/src/chat/generation.service.ts |
| 7 | Instrument sync-generation.service.ts | 48bde35 | apps/api/src/api-v1/sync-generation.service.ts |
| 8 | Instrument exports.service.ts | f43dfed | apps/api/src/exports/exports.service.ts |

## Events Tracked

### Activity Events (via ActivityService)

| Service | Event Type | Category | Metadata |
|---------|-----------|----------|----------|
| auth | signup | auth | ip |
| auth | login | auth | ip |
| auth | logout | auth | - |
| auth | password_reset | auth | - |
| billing | subscribe | billing | tier |
| billing | credit_purchase | billing | packId, credits |
| billing | cancel_subscription | billing | - |
| api-keys | api_key_create | api | keyPrefix, scopes |
| api-keys | api_key_revoke | api | keyId |
| presentations | fork_deck | deck | presentationId, forkedFromId |
| presentations | publish_deck | deck | presentationId |
| knowledge-base | upload_doc | knowledge | documentId, mimeType |
| generation | generate_outline | generation | presentationId, slideCount |
| generation | generate_slides | generation | presentationId, slideCount, themeId, model |
| generation | generate_fail | generation | presentationId, error |
| sync-generation | generate_outline | generation | presentationId, slideCount |
| sync-generation | generate_slides | generation | presentationId, slideCount, themeId, model, presentationType |
| sync-generation | generate_fail | generation | presentationId, error |
| exports | export_start | export | jobId, format |
| exports | export_complete | export | jobId, format, duration |
| exports | export_fail | export | jobId, error |

### Generation Metrics (via GenerationMetricsService)

| Service | Operation | Data Captured |
|---------|-----------|--------------|
| generation | outline | model, tokens (in/out/cache), duration, slideCount |
| generation | slide | model, tokens (in/out/cache), duration, slideType |
| sync-generation | outline | model, tokens (in/out/cache), duration, slideCount |
| sync-generation | slide | model, tokens (in/out/cache), duration, slideType |

## Decisions Made

1. **Fire-and-forget pattern**: All activity tracking and metrics recording are fire-and-forget calls that never block the main flow, matching the existing ObservabilityModule design
2. **completeJsonWithUsage for generation**: Both generation services switched from `completeJson` to `completeJsonWithUsage` to capture token usage and model info
3. **Extended return type for generateSlideContent**: Added `_usage`, `_model`, `_durationMs` optional fields to the return type using intersection type, avoiding breaking changes to existing callers
4. **No module imports needed**: ObservabilityModule is @Global(), so only constructor injection was needed in each service
5. **performance.now() for timing**: Used `performance.now()` for high-resolution LLM call timing in generation services

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with zero errors
- All 8 services compile correctly with new imports and constructor injections

## Metrics

- **Duration:** ~9 minutes
- **Completed:** 2026-03-02
- **Files modified:** 8
- **Lines added:** ~149
