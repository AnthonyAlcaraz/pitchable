# Future Optimizations — Pitchable Knowledge Base

Inspired by [Two Years of Vector Search at Notion](https://www.notion.com/blog/vector-search) (10x scale, 90% cost reduction through five compounding optimizations).

## 1. Content-Hash Deduplication

**Notion lesson:** "Deduplication saved us 30% of embedding costs."

### Now (Implemented)

- SHA-256 content hash on every `DocumentChunk`
- Before embedding, check if identical chunk (by hash) already exists in user's KB with embeddings
- Skip redundant OpenAI embedding + ZeroEntropy indexing calls for duplicate chunks
- All chunks still stored in DB for keyword search — dedup only skips expensive API calls
- Document-level hash on `Document` for quick whole-file duplicate detection

### At Scale

- Cross-user dedup for shared/public documents (global hash index)
- Approximate dedup via SimHash or MinHash for near-duplicate paragraphs
- Background job to retroactively deduplicate historical chunks

**Trigger:** Embedding costs exceed $50/month or chunk table exceeds 500K rows.

## 2. Quantized Embeddings

**Notion lesson:** "Binary quantization cut storage 32x with minimal recall loss."

### Now

- Full `float4` vectors in pgvector (`vector(1536)` for text-embedding-3-small)
- Good recall, high storage cost per vector

### At Scale

- Switch to `halfvec(1536)` (16-bit) for 2x storage reduction with negligible recall loss
- Use Matryoshka truncation (text-embedding-3-small supports it) to reduce from 1536 to 512 dims
- Binary quantization (`bit(1536)`) for coarse first-pass, then rescore top-K with full vectors
- Two-stage retrieval: binary scan -> float rescore

**Trigger:** Vector table exceeds 1M rows or pgvector query latency exceeds 100ms p95.

## 3. Streaming Ingestion Pipeline

**Notion lesson:** "We moved from batch to streaming to keep latency under 1 second."

### Now

- BullMQ job per document: extract -> chunk -> store -> embed -> index (sequential)
- Each step waits for the previous to complete

### At Scale

- Stream chunks to ZeroEntropy as they're created (don't wait for all chunks)
- Parallel embedding batches (current `batchEmbed` already batches, but could overlap with DB writes)
- Webhook notification to frontend when each chunk is ready (progressive loading)
- Priority queue: small documents fast-tracked, large PDFs in background

**Trigger:** Average document processing time exceeds 30 seconds or user complaints about upload latency.

## 4. Tiered Retrieval

**Notion lesson:** "We layered keyword search, vector search, and a reranker."

### Now

- ZeroEntropy (primary) with pgvector fallback
- FalkorDB entity graph for structured queries
- Reranker service for result quality

### At Scale

- Add BM25 keyword index (PostgreSQL full-text search) as fast pre-filter
- Cache frequent queries (brief-level query cache with TTL)
- Adaptive retrieval: route simple queries to keyword search, complex to vector + reranker
- Per-brief vector index partitioning (avoid scanning all user chunks)

**Trigger:** Retrieval latency exceeds 500ms p95 or brief document count exceeds 100.

## 5. Embedding Model Evolution

**Notion lesson:** "We re-embedded everything when better models came out — and it was worth it."

### Now

- OpenAI `text-embedding-3-small` (1536 dims, ~$0.02/1M tokens)
- Single embedding per chunk

### At Scale

- Track embedding model version per chunk (add `embeddingModel` column)
- Background re-embedding job when switching models (process during off-peak)
- A/B test retrieval quality between old and new embeddings before full migration
- Consider open-source models (e.g., Cohere embed-v4, Jina) for cost reduction

**Trigger:** New embedding model shows >5% improvement on retrieval benchmarks, or OpenAI pricing changes significantly.

---

## Implementation Priority

| Optimization | Effort | Impact | When |
|---|---|---|---|
| Content-hash dedup | Low | Medium | **Now** |
| Quantized embeddings | Medium | High | 500K+ chunks |
| Streaming ingestion | Medium | Medium | 30s+ processing |
| Tiered retrieval | High | High | 500ms+ latency |
| Model evolution | Low | Variable | Better model available |
