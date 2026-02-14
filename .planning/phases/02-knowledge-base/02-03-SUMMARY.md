# Plan 02-03 Summary: Embeddings + pgvector + Search

## Status: COMPLETE

## What was built
- **EmbeddingService** — OpenAI text-embedding-3-small wrapper with single embed() and batchEmbed() (100 texts/batch)
- **VectorStoreService** — pgvector raw SQL operations: updateChunkEmbeddings, searchSimilar (cosine distance via <=> operator), deleteDocumentEmbeddings
- **SearchKbDto** — Validated search request (query, limit 1-50, threshold 0-1)
- **Document processor** — Extended with embedding step: chunks stored → status EMBEDDING → generate embeddings → store vectors → status READY
- **Search endpoint** — POST /knowledge-base/search: embed query → pgvector similarity search → return ranked chunks with scores
- **Module exports** — EmbeddingService + VectorStoreService exported for Phase 3 RAG reuse

## Files created
- `apps/api/src/knowledge-base/embedding/embedding.service.ts`
- `apps/api/src/knowledge-base/embedding/vector-store.service.ts`
- `apps/api/src/knowledge-base/dto/search-kb.dto.ts`

## Files modified
- `apps/api/src/knowledge-base/document-processing.processor.ts` — Added embedding steps 6-8
- `apps/api/src/knowledge-base/knowledge-base.service.ts` — Added search() method + embedding service deps
- `apps/api/src/knowledge-base/knowledge-base.controller.ts` — Added POST /search endpoint
- `apps/api/src/knowledge-base/knowledge-base.module.ts` — Added EmbeddingService + VectorStoreService to providers/exports

## Pipeline flow
UPLOADED → PARSING → extract text → chunk → store chunks → EMBEDDING → generate embeddings → store vectors → READY

## Verification
- TypeScript: 0 errors (`npx tsc --noEmit`)
- pgvector import: `import * as pgvector from 'pgvector'` (CJS module)
- 7 controller endpoints: upload, text, url, list, get, delete, search
