# Pitfalls Research

**Domain:** AI Presentation SaaS (knowledge base to slides with AI visuals)
**Researched:** 2026-02-14
**Confidence:** HIGH (combines web research, competitor analysis, official documentation, and direct Z4 operational experience)

---

## Critical Pitfalls

### CP-1: Slide Content Overflow -- The Silent Destroyer

**What goes wrong:**
LLM-generated content exceeds slide boundaries. Markdown-based renderers (Marp) have no built-in vertical auto-scaling. python-pptx's `TEXT_TO_FIT_SHAPE` auto-fit is unreliable and does not persist after text edits. Content gets cropped in PDF export, invisible in preview, or renders as an unreadable wall of text. Marp Core v4 only auto-scales horizontally (code blocks, math blocks, fitting headers), not vertically exceeded content.

**Why it happens:**
LLMs optimize for completeness, not visual hierarchy. A prompt asking for "3 key points" might return 50 words or 300 words depending on the topic. No programmatic way exists to measure rendered text height before placement -- font metrics, line wrapping, and padding all interact unpredictably. The fundamental presentation design rules (6x6 rule: max 6 bullets x 6 words; 10-20-30 rule: minimum 30pt font) are violated by default by every LLM.

**How to avoid:**
- Enforce hard character/word limits per slide in the LLM prompt (maximum 40 words per bullet, maximum 4-6 bullets per slide, minimum 24pt font)
- Implement a post-generation validation pass that counts content length and triggers re-generation or auto-split when limits are exceeded
- Build a "slide budget" system: estimate available content area per layout template, enforce that budget during content generation
- For Marp: use the VS Code diagnostic API pattern to detect overflow before export
- For python-pptx: pre-calculate text extents using font metrics (Pillow's `ImageFont.getsize()`) before placement
- Auto-split: if content exceeds limits, split into multiple slides rather than shrinking text

**Warning signs:**
- QA reports of "cut off text" in exported PDFs
- Inconsistent slide density (some slides have 2 words, others have 200)
- Marp VS Code diagnostics showing overflow warnings
- Users complaining slides look like documents

**Phase to address:**
Phase 1 (Core Engine). Content budget enforcement must be baked into the generation pipeline from day one. Retrofitting overflow detection onto an existing pipeline requires touching every layout template.

---

### CP-2: The "Gamma Problem" -- Ugly Output Kills Trust Instantly

**What goes wrong:**
AI-generated slides look amateurish. Users see one bad slide and abandon the product. The most common complaints across Gamma (1.9/5 on Trustpilot), SlidesAI, and Plus AI reviews: broken layouts, mismatched fonts, repetitive "AI look" across every deck, and images with zero relevance to content. First-impression failure is the #1 killer for AI presentation tools.

**Why it happens:**
Most AI presentation tools treat design as an afterthought. They generate content first, then attempt to style it. Without hard constraints, LLMs produce slides that violate basic design principles: too many bullet points, clashing colors, inconsistent font sizes, walls of text, and random stock imagery.

**How to avoid:**
The design constraint engine must be a first-class system, not a styling layer applied after content generation. Every slide must pass through validation rules BEFORE reaching the user:
- Maximum 6 bullet points per slide, maximum 10 words per bullet
- Maximum 3 font sizes per slide (title, body, caption)
- Maximum 3 distinct colors per slide (excluding neutrals)
- WCAG AA contrast validation on every text-background pair (4.5:1 for body text, 3:1 for large text 24pt+)
- Curated font pairings only (serif heading + sans-serif body, or vice versa; never two decorative fonts)
- No text inside AI-generated images (text always in slide layer)

**Warning signs:**
- Monitor percentage of generated slides that violate any design rule. If above 0% in production, the constraint engine has gaps
- User retention drops after first generation (users see ugly output and never return)

**Phase to address:**
Phase 1. The constraint engine IS the product.

---

### CP-3: Color Accessibility Disasters

**What goes wrong:**
AI generates slides with color combinations that are illegible, ugly, or inaccessible. Red text on green background is invisible to 8% of men (deuteranopia). Yellow text on white fails WCAG contrast (ratio ~1.07:1). Light gray on white disappears on projectors. Color contrast is the #1 accessibility violation on the web, affecting 83.6% of all websites (WebAIM 2024 Million analysis).

**Why it happens:**
LLMs do not understand color theory. Colors that sound reasonable in text ("red for urgency, green for growth") fail in practice. Without a validated palette system, every generation is a gamble. There is no exception to WCAG contrast rules for brand colors or corporate design systems (except logos).

**How to avoid:**
Implement a three-layer color constraint system:
1. **Banned combinations (hard block):** Red/green, yellow/white, light gray/white, blue/purple, neon pairs
2. **WCAG contrast validation:** Every text-background pair must pass AA minimum (4.5:1 for text <24pt, 3:1 for text >=24pt). Run WebAIM Contrast Checker algorithm on every generated slide
3. **Curated palette system:** Users select from pre-validated palettes tested for all color-blindness variants (protanopia, deuteranopia, tritanopia). No arbitrary color selection.

Safe default pairs: white on dark navy (#1a1a2e, ratio 15.6:1), dark charcoal (#333333) on white (ratio 12.6:1), white on dark teal (#006666, ratio 7.2:1)

**Warning signs:**
- Any generated slide failing automated WCAG contrast check
- User reports of "can't read the text" especially in meeting room projector context

**Phase to address:**
Phase 1 (constraint engine core).

---

### CP-4: Export Format Fidelity -- "It Looked Fine Until I Downloaded It"

**What goes wrong:**
Presentations render beautifully in the web app but break on export. Specific failures by format:

**Marp CLI:** Regular PPTX output consists of pre-rendered background images (content NOT editable in PowerPoint). `--pptx-editable` is experimental, throws errors with complex themes, and does NOT support presenter notes. Firefox PDF output is incompatible with Chrome rendering.

**python-pptx:** No animation/transition support. No SmartArt. Font formatting gets reset to defaults during text replacement. Generated files sometimes trigger "PowerPoint found a problem with content" repair dialogs. `TEXT_TO_FIT_SHAPE` auto-fit does not persist to later text changes. Only TrueType (.ttf) fonts can be embedded -- OpenType CFF fonts (.otf) are not supported by PowerPoint's embed feature.

**Google Slides API:** Write requests limited to 600/minute/project and 60/minute/user. Exceeding quotas returns 429 errors. OAuth new-user authorization has its own rate limits.

**PDF Export:** Variable fonts lose weight during PDF export. Cloud-managed fonts (Adobe, Google CDN) often fail to embed. Tables copied from external sources have corrupt formatting data.

**Why it happens:**
Each export format has its own rendering engine with different capabilities. What CSS can express is not what PPTX XML can express. The web preview renders with browser font engines, PPTX renders with PowerPoint's engine, PDF renders with yet another engine. Each has different font fallback behavior.

**How to avoid:**
- Use python-pptx for PPTX generation (not Marp's --pptx-editable) since direct XML generation gives more control
- Restrict font palette to confirmed-embeddable TrueType (.ttf) fonts. Never use variable fonts in exports
- Bundle font files directly in the export pipeline rather than referencing system fonts
- Use batchUpdate for Google Slides API (combine all mutations into one request) with exponential backoff (1s, 2s, 4s, 8s, max 60s)
- Automated visual regression tests: render each slide in web, export to each format, screenshot the result, compare pixel differences. Alert on >5% deviation
- Test every slide template in every export format before launching that template
- Limit design features to the intersection of what ALL export formats support

**Warning signs:**
- "The fonts look different on my computer" support tickets
- PDF exports where text appears as boxes or question marks
- Font substitution warnings in PowerPoint when opening generated files
- PowerPoint "found a problem with content" repair dialogs

**Phase to address:**
Phase 1 (font selection constraints + template design), Phase 5 (export pipeline). Font decisions in Phase 1 prevent rewrite in Phase 5.

---

### CP-5: Image Generation Cost Explosion

**What goes wrong:**
Each presentation generates 5-15 images. At $0.02-$0.17 per image (depending on provider and resolution), a single presentation costs $0.10-$2.55 in image generation alone. Free tier user generating 10 presentations burns $1-$25 in compute. Google slashed Gemini API free tier quotas by 50-92% on December 7, 2025. OpenAI said "our GPUs are melting" and introduced temporary rate limits. Nano Banana Pro reduced free tier from 3 to 2 images/day in November 2025.

**Why it happens:**
Image generation pricing is per-call, not per-token. Users choose "more images" because "more is better." Teams price based on subscription models without modeling per-generation variable costs. Pricing: GPT Image 1: $0.011-$0.167 per 1024x1024. Imagen 4: $0.02-$0.06. At 12 images/deck and 20 decks/month for a $10/month plan, image costs alone are $2.40-$40.08 -- potentially exceeding revenue.

**How to avoid:**
- **Image caching:** Cache generated images keyed on prompt + style parameters. Same prompt = same image, no regeneration
- **Tiered image quality:** Free tier gets 512x512 or no images; paid gets 1024x1024
- **Provider fallback chains:** Try cheapest provider first, fall back to expensive on failure
- **Model routing:** Use cheapest model (Flux.1 Schnell) for preview/draft, premium models only for final export
- **Per-user daily image generation caps** independent of credits
- **Cost-per-presentation as first-class metric** from day one
- **Self-hosted fallback:** At >10K images/day, self-hosting Flux/SDXL on GPU instances ($1.29-$2.99/hr for A100) becomes cheaper than API pricing. Plan the migration path.

**Warning signs:**
- Monthly image generation bill growing faster than user count
- Free tier users generating more images than paid users
- Single users triggering rate limits repeatedly
- Any plan's average cost exceeding 40% of revenue

**Phase to address:**
Phase 1 (cost modeling in architecture), Phase 3 (image generation implementation), Phase 4 (credit system must account for variable image costs).

---

### CP-6: AI Image Text Rendering Failure

**What goes wrong:**
Users expect AI-generated images to contain readable text (chart labels, diagram text, title graphics). Current models warp, duplicate, and misspell text. Generated images reading "Quartlery Revenue" or "Anual Report" destroy credibility instantly. Sam Altman acknowledged OpenAI "refusing some generations that should be allowed." Nano Banana Pro sometimes ignores prompts entirely (confirmed from Z4 operational experience).

**Why it happens:**
Diffusion models generate images pixel-by-pixel without a concept of "characters" or "spelling." Text rendering requires pixel-perfect placement that conflicts with the stochastic nature of image generation.

**How to avoid:**
- **Golden rule: NEVER generate text inside images.** All text belongs in the slide layer, not the image layer
- Use images as backgrounds/illustrations only. Generate scenes, objects, abstract visuals -- never charts, diagrams, or text graphics
- Prompt engineering: explicitly include "no text, no words, no labels, no letters" in every image generation prompt
- Post-generation OCR validation: run Tesseract on generated images, flag for regeneration if text detected with confidence > 0.7
- For charts/diagrams: generate programmatically (Chart.js, D3, Mermaid) rather than through image AI

**Warning signs:**
- User complaints about typos that don't exist in the slide text (they're in the images)
- Image regeneration rates above 30%
- Support tickets with screenshots showing garbled text in background images

**Phase to address:**
Phase 3 (image generation). Establish as an architectural rule: text and images are always separate layers.

---

### CP-7: Credit System Race Conditions and Abuse

**What goes wrong:**
Concurrent API requests drain credits below zero. Users discover they can start multiple presentations simultaneously and get 5 presentations for the cost of 1. Promotional credits stack with purchased credits in unintended ways. Partial credit transfers during tier upgrades create exploitable loopholes. Missing 1% of metering events means 1% revenue leakage -- at $2M ARR that equals $20K/year lost. Revenue loss from billing errors typically sits between 1-5% of total revenue.

**Why it happens:**
Credit deduction is a distributed systems problem disguised as simple subtraction. When multiple requests hit the credit check simultaneously, each sees "sufficient credits" and proceeds. By the time deduction happens, the account is negative. Race conditions are especially dangerous during image generation, where a single presentation triggers 5-15 separate billable events.

**How to avoid:**
- Use optimistic locking with atomic decrement operations (Redis DECRBY or PostgreSQL `UPDATE ... RETURNING` with row-level locks)
- **Reserve credits at presentation start** (full estimated cost), then refund unused credits on completion -- the reservation pattern
- Implement a credit ledger (append-only log) rather than a mutable balance field -- enables audit trail and replay
- Rate limit presentation starts per user (not just API calls) -- maximum 3 concurrent generations
- For free tier: email validation, device fingerprinting, rate limiting per IP, behavioral monitoring (flag accounts that consume all credits within 1 hour of creation)
- Test with concurrent load: 100 simultaneous presentation requests from the same free-tier account

**Warning signs:**
- Negative credit balances in the database
- Users with more generated presentations than their credit purchases support
- Revenue per user declining while usage per user increases
- Account creation spikes from same IP/fingerprint

**Phase to address:**
Phase 4 (Credit System). The reservation pattern (reserve up front, refund on completion) must be the default architecture.

---

### CP-8: RAG Retrieval Produces Irrelevant or Hallucinated Slide Content

**What goes wrong:**
Knowledge base retrieval returns chunks that are semantically similar but contextually wrong. A query about "Q3 revenue growth" retrieves a chunk about "Q2 revenue growth" because embeddings are close. The LLM confidently presents Q2 data labeled as Q3. When AI tools are linked to company files with outdated or incomplete data, they hallucinate and generate faulty information, stating it as true. Users trust AI-generated presentations without fact-checking (documented human tendency toward AI trust).

**Why it happens:**
Fixed-size chunking destroys contextual relationships. A 512-token chunk splitting a table in half produces an embedding matching the topic but containing only partial data. Poorly processed documents reduce retrieval accuracy by up to 45%. The fundamental conflict: small chunks (100-256 tokens) improve semantic matching precision, but large chunks (512-1024 tokens) preserve context. 70% of enterprise teams still use fixed-size chunking despite evidence it produces inferior results.

**How to avoid:**
- Use semantic chunking (split on section boundaries, not token counts) with 10-20% overlap between chunks
- Attach metadata to every chunk: source document, page number, section header, date
- Implement a retrieval verification step: after RAG retrieval, have the LLM assess whether retrieved content actually answers the query before generating slide content
- For tabular data: chunk entire tables as single units, never split rows across chunks
- Set a confidence threshold on retrieval similarity scores -- below threshold, the slide says "Data not found in knowledge base" rather than hallucinating
- Include source attribution on every data-containing slide so users can verify

**Warning signs:**
- Users reporting "wrong numbers" or "outdated data" in generated slides
- High retrieval similarity scores (>0.9) but factually incorrect content
- Slides containing data from the wrong time period, product, or department

**Phase to address:**
Phase 2 (Knowledge Base). Chunk strategy and retrieval quality directly determine product trustworthiness. Must be validated with real user documents before building presentation generation on top.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded slide dimensions (16:9 only) | Faster MVP | Cannot support custom aspect ratios (4:3, A4, square) | MVP only, refactor in Phase 2 |
| Single image provider | Simpler integration | Provider outage = total image failure, no cost optimization | Never -- implement at least 2 providers from start |
| String concatenation for Marp Markdown | Quick prototyping | Special characters break output (`$`, pipe `\|`, backticks); blank line collapse breaks tables | Never -- use a template engine (Handlebars, EJS) |
| sed for Markdown post-processing on Windows | Quick fix | sed interprets `$` as backreferences, destroying dollar signs and template variables. Blank line collapse (`/^$/N;/^\n$/d`) removes blank lines required before Markdown tables. CONFIRMED from Z4 operational experience. | Never -- use Node.js string replacement |
| Synchronous image generation | Simpler code flow | 15 images x 5-10 seconds = 75-150 second generation time, request timeouts | MVP only, must parallelize before launch |
| Storing presentations as files on disk | No database needed | Cannot search, version, or share presentations; deployment becomes stateful | MVP only if self-hosted prototype |
| Skipping chunk overlap in RAG | Faster ingestion | Information at chunk boundaries is lost, retrieval accuracy drops | Never |
| Single generic embedding model for all doc types | Simpler pipeline | Tables, prose, and code embed differently. Retrieval quality varies by content type. | MVP only, test and specialize in Phase 2 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Slides API | Sending individual API calls per element (text box, image, shape) | Use `batchUpdate` to combine all mutations into one request. Per-user limit is 60 req/min, per-project is 300/min. Implement exponential backoff for 429s. |
| OpenAI Image API | Not handling `429 Too Many Requests` with backoff | Implement truncated exponential backoff (1s, 2s, 4s, 8s, max 60s). Pre-check rate limit headers before sending. |
| python-pptx | Assuming `TEXT_TO_FIT_SHAPE` auto-fit works reliably | It does not persist to later text changes. Pre-calculate text extents and manually set font sizes. |
| python-pptx fonts | Using OpenType CFF fonts (.otf) expecting them to embed | PowerPoint only embeds TrueType (.ttf) fonts. Restrict palette to .ttf fonts only. Bundle font files in export. |
| Marp CLI | Piping output through `sed` on Windows for post-processing | `sed` interprets `$` as backreferences, destroying dollar signs and template variables. Use Node.js string replacement instead. |
| PDF export (any library) | Expecting exported PDF to match web preview pixel-for-pixel | PDF rendering engines differ from browser engines. Build visual regression test comparing screenshots. |
| Node.js child_process to Python | Sending data to Python subprocess before it initializes | Listen for the `spawn` event before writing to stdin. Always call `sys.stdout.flush()` in Python or use `-u` flag for unbuffered output. |
| Node.js child_process to Python | Not handling subprocess errors properly | Set stderr to inherit mode for error propagation. Check exit code (code === 0) before resolving. Use spawn for large data streams, exec for small outputs (<200k). |
| Node.js child_process to Python | JSON parsing failures in exit handler | Python subprocess may emit partial JSON on crash. Wrap JSON.parse() in try/catch with proper error propagation to parent process. |
| Embedding models | Using a single generic embedding model for all document types | Different content types (tables, prose, code) embed differently. Test retrieval quality per content type. Consider specialized models. |
| PDF parsing | Assuming PyMuPDF handles all PDFs equally well | Tables lose structure, multi-column layouts merge incorrectly, headers/footers pollute body text. Use pdfplumber specifically for table extraction. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential image generation | 60-150 second presentation generation time | Parallelize image generation with Promise.all() and rate limit pooling | Immediately -- any presentation with 5+ images |
| Embedding entire documents on upload | Upload hangs for 5+ minutes on large files | Stream-process documents: parse, chunk, embed in batches of 50-100 chunks | Documents over 50 pages |
| Storing embeddings in SQLite/PostgreSQL without HNSW | Vector search latency >500ms | Use purpose-built vector store (Qdrant, Pinecone, pgvector with HNSW index). Default to HNSW + metadata filtering for sub-100ms retrieval at 95%+ recall. | Over 100K chunks |
| Re-embedding unchanged documents | Ingestion takes hours for large knowledge bases | Hash each chunk, skip embedding if hash unchanged | Knowledge bases with 1000+ documents |
| Rendering full presentation preview on every edit | UI becomes sluggish, 2-3 second lag per keystroke | Render only the current slide; lazy-load adjacent slides | Presentations with 20+ slides |
| Unbounded LLM context window usage | API costs spike, generation slows, context truncation causes errors | Cap retrieved chunks at 5-8 per slide, summarize before injection | Knowledge bases with high-similarity chunks |
| No image cache | Same prompts generate new images every time, burning API budget | Cache generated images keyed on prompt + style + seed hash | Immediately -- any repeated template usage |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing uploaded documents without sanitization | Malicious PDFs exploit parsing libraries (CVEs in pdf.js, PyMuPDF, pdfminer) | Sandbox document parsing in isolated containers; validate file headers (magic bytes) before parsing |
| Exposing RAG retrieval to prompt injection | Malicious content in uploaded documents gets retrieved and executed as instructions by the LLM | Separate system prompts from retrieved content; use input/output guardrails; treat all retrieved content as untrusted data |
| Sharing presentation URLs without access control | Anyone with a URL can view confidential presentations | Implement signed URLs with expiration; require authentication for all presentation access |
| Credit system API without rate limiting | Attackers enumerate valid API keys or exhaust credits via scripted requests | Rate limit by IP and API key; implement CAPTCHA on free tier generation |
| Storing API keys (OpenAI, Google) in client-side code | API keys exposed in browser dev tools | All AI API calls must go through server-side proxy; never expose provider keys to clients |
| User-uploaded images without validation | XSS via SVG uploads, server-side request forgery via image URL processing | Validate image file headers (magic bytes), strip SVG scripts, reject external URL image processing |
| OAuth token storage | Tokens stored in plaintext allow account takeover if database is compromised | Encrypt tokens at rest. Implement proper refresh token rotation. Test token expiry paths explicitly. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generating entire presentation before showing anything | User stares at loading spinner for 60-120 seconds, assumes it's broken. Nielsen Norman Group: users lose attention focus after 10 seconds. | Stream slides as they're generated -- show slide 1 immediately while slides 2-N generate. Progressive rendering with skeleton loading. |
| No preview of image before placement | User gets a random AI image they don't like, must regenerate entire slide | Show 2-3 image options per slide, let user pick or regenerate individual images |
| Over-constraining design templates | Every presentation looks identical; users feel the tool is "boring" | Provide 3-5 distinct visual themes with variation within each (color accents, layout alternatives). Give illusion of choice within validated constraints. |
| Under-constraining design templates | Presentations are ugly -- clashing colors, inconsistent spacing, too many fonts | Enforce design rules silently (max 2 fonts, complementary palette, consistent margins) while giving users the illusion of choice |
| Requiring knowledge base upload before first presentation | New user wants to try the product but has nothing to upload | Offer "quick start" mode with sample knowledge bases or a "paste your content" text box |
| Showing raw LLM/API errors to users | "Error: 429 Too Many Requests" means nothing to non-technical users | Map all errors to human-readable messages: "We're generating a lot of images right now. Your presentation will be ready in ~2 minutes." |
| Two-phase generation without progress feedback | Users don't know if the system is working or stuck | Show per-slide progress: "Generating slide 3 of 12... Creating image for slide 4..." |
| Over-animating exported presentations | Animation fatigue on video calls, lag on slower devices (growing problem in 2026 with easy animation tools) | Minimal default animations. Offer animation presets but default to "none" or "subtle fade." |

## "Looks Done But Isn't" Checklist

- [ ] **Slide overflow:** Content renders in web preview but crops in PDF/PPTX export -- verify every layout template at maximum content length
- [ ] **Font embedding:** Fonts display in browser but fallback to Arial in downloaded PPTX -- verify with a clean machine that has no custom fonts installed
- [ ] **Image placement:** Images center correctly at 16:9 but break at 4:3 -- verify every image placeholder at every supported aspect ratio
- [ ] **Table formatting:** Tables render in Markdown preview but lose borders/alignment in PPTX -- verify with tables that have 2 columns and tables that have 8 columns
- [ ] **Credit deduction:** Credits deduct correctly for single requests but double-deduct under concurrent load -- verify with 10 simultaneous requests from one account
- [ ] **RAG accuracy:** Retrieval works with test documents but fails on real user documents with OCR artifacts, scanned PDFs, mixed languages -- verify with 20+ real-world documents of varying quality
- [ ] **Export parity:** PPTX export works but PDF from that PPTX has different formatting -- verify the full chain: generation -> PPTX export -> PDF from PPTX -> print
- [ ] **Special characters:** Slides with `$`, `%`, `&`, `|`, backticks render correctly in preview but break in Markdown processing -- verify with financial data containing currency symbols
- [ ] **Empty states:** Generation works with good input but crashes or produces blank slides when knowledge base returns zero results -- verify with queries that match nothing
- [ ] **Reveal.js portability:** Downloaded HTML bundle works when served from localhost but fails when opened via double-click (CORS on local file access) -- verify both access methods
- [ ] **Google OAuth refresh:** Token works for initial generation but fails silently after expiry -- force-expire tokens in staging and verify re-auth flow
- [ ] **Multi-format parity:** Slides look identical in web preview but Slidev exports slides as images (text not selectable), Reveal.js loses animations in PDF, PPTX loses CSS effects -- verify each format preserves editability and visual fidelity

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Slide overflow shipped to users | LOW | Add content length validation as middleware; existing presentations need re-generation only if users report issues |
| Wrong data from RAG on user presentations | HIGH | Cannot un-send wrong data. Must implement retrieval verification, notify affected users, offer re-generation. Reputation damage is the real cost. |
| Cost explosion from image generation | MEDIUM | Implement caching immediately. Historical presentations are sunk cost. Add daily cost alerting to prevent recurrence. |
| Font rendering breaks in exports | MEDIUM | Restrict font palette to safe TrueType fonts. Existing exports need re-generation. User communication required. |
| Credit system exploited via race conditions | HIGH | Fix requires architectural change (reservation pattern). Must audit all accounts for negative balances and decide whether to charge or absorb loss. |
| Prompt injection via uploaded documents | HIGH | Requires content sanitization pipeline retrofit. Must re-process all existing documents. Security audit of all generated presentations. |
| sed destroying dollar signs in Markdown | LOW | Replace all sed calls with Node.js string replacement. Re-process affected presentations. Confirmed fix from Z4 experience. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Slide content overflow (CP-1) | Phase 1: Core Engine | Generate 100 presentations with varied content lengths; zero overflow in exports |
| Ugly output / design quality (CP-2) | Phase 1: Core Engine | User testing: 10 users rate output >7/10 on visual appeal AND >6/10 on variety |
| Color accessibility disasters (CP-3) | Phase 1: Core Engine | Every generated color pair passes WCAG AA contrast ratio (4.5:1 normal text, 3:1 large text) |
| Export format fidelity (CP-4) | Phase 1 (templates) + Phase 5 (export) | Visual regression test suite passes on clean Windows, Mac, Linux machines |
| Image generation cost explosion (CP-5) | Phase 1 (cost model) + Phase 3 (implementation) | Cost simulation: 1000 free-tier users x 10 presentations/month; monthly cost < $500 |
| Text-in-image failures (CP-6) | Phase 3: Image Generation | Architectural rule enforced: text and images are separate layers, zero exceptions |
| Credit system race conditions (CP-7) | Phase 4: Credit System | Load test: 100 concurrent requests from single account; final balance = initial - (N x cost), no negatives |
| RAG hallucination (CP-8) | Phase 2: Knowledge Base | Benchmark retrieval accuracy against labeled test set; >90% precision at k=5 |
| Knowledge base ingestion quality (MP-1) | Phase 2: Knowledge Base | Test with 20+ real-world documents (scanned PDFs, complex tables, multi-column); <20% content loss |
| Image style inconsistency (MP-3) | Phase 3: Image Generation | Generate 10-slide deck; all images visually coherent in style |
| Image generation latency (MP-4) | Phase 3: Image Generation | p95 time-to-first-visible-slide < 10 seconds; p95 time-to-complete-deck < 120 seconds |
| Node.js/Python interop failures | Phase 1: Core Engine | Integration test: Python subprocess crash returns clean error to Node.js parent, no zombie processes |
| Special character handling (Markdown) | Phase 1: Core Engine | Test suite with financial data: `$1,234`, `Q3 & Q4`, `100% growth`, pipe tables all render correctly |
| Google Slides API rate limits | Phase 5: Export | Batch operations for all mutations; exponential backoff handles 429s; single presentation never exceeds 10 API calls |
| Multi-format export parity | Phase 5: Export | Automated comparison: PPTX, PDF, Google Slides, Reveal.js exports all pass layout validation |

## Sources

### Design Quality and Accessibility
- [WCAG 2.1 SC 1.4.3: Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) -- HIGH confidence
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) -- HIGH confidence
- [AllAccessible: Color Contrast Guide 2025](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025) -- Color contrast #1 violation affecting 83.6% of websites
- [Sparkbox: Myth of Creative Restraint in Design Systems](https://sparkbox.com/foundry/design_system_consistency_versus_flexibility_design_system_constraints) -- Consistency vs flexibility tradeoffs
- [zeroheight: Balancing Flexibility and Consistency](https://zeroheight.com/blog/finding-the-right-balance-between-consistency-and-flexibility-for-your-design-system/) -- Design system constraints

### AI Presentation Tools -- Competitor Issues
- [SlidesAI: Common AI Presentation Mistakes](https://www.slidesai.io/blog/common-ai-presentation-mistakes) -- Generic templates, audience engagement, font mismatches
- [Insight7: Avoid Common Pitfalls in AI Generated Presentations](https://insight7.io/avoid-common-pitfalls-in-ai-generated-presentations/) -- Content accuracy, design quality
- [TeamSli.de: GenAI Effects on Slide Libraries](https://www.teamsli.de/genai-effects-on-slidelibraries/) -- AI hallucination in corporate presentations, human trust problem

### Export Formats
- [Marp overflow discussion](https://github.com/orgs/marp-team/discussions/589) -- No vertical auto-scaling, only horizontal
- [Marp Core v4 changes](https://github.com/orgs/marp-team/discussions/533) -- Content centering, overflow from bottom only
- [python-pptx text fitting issue #715](https://github.com/scanny/python-pptx/issues/715) -- TEXT_TO_FIT_SHAPE limitations
- [python-pptx auto-fit issue #973](https://github.com/scanny/python-pptx/issues/973) -- Auto-fit does not take effect
- [python-pptx auto-fit analysis](https://python-pptx.readthedocs.io/en/latest/dev/analysis/txt-autofit-text.html) -- Complex interaction of shape size, font, autofit, wrap
- [Google Slides API Usage Limits](https://developers.google.com/workspace/slides/api/limits) -- 60 req/user/min, 300 req/project/min -- HIGH confidence
- [Microsoft: Font embedding in PDF export](https://learn.microsoft.com/en-us/answers/questions/4911249/how-can-i-force-export-to-pdf-to-embed-the-my-non) -- Only TrueType fonts embed
- [Syncfusion: Font problems in PowerPoint to PDF conversion](https://support.syncfusion.com/kb/article/15472/how-to-resolve-font-problems-during-powerpoint-to-pdf-or-image-conversion) -- Variable font weight issues
- [Slidev export limitations](https://sli.dev/guide/exporting.html) -- PPTX export as images, text not selectable
- [Reveal.js PDF export](https://revealjs.com/pdf-export/) -- Format parity challenges

### Image Generation
- [OpenAI Image Generation Rate Limits](https://help.openai.com/en/articles/6696591-what-are-the-rate-limits-for-image-generation) -- Official limits
- [TechRadar: OpenAI "GPUs are melting"](https://www.techradar.com/computing/artificial-intelligence/our-gpus-are-melting-openai-puts-limits-on-image-creation-and-delays-rollout-to-free-accounts) -- Rate limit context
- [AI Image Pricing 2026: Google vs OpenAI](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai) -- Imagen 4: $0.02-$0.06, GPT Image 1: $0.011-$0.167
- [Nano Banana Pro Usage Limits](https://www.aifreeapi.com/en/posts/nano-banana-pro-usage-limit) -- Free tier cuts November 2025

### RAG and Chunking
- [RAG Pipeline Deep Dive (Medium, Jan 2026)](https://medium.com/@derrickryangiggs/rag-pipeline-deep-dive-ingestion-chunking-embedding-and-vector-search-abd3c8bfc177) -- Chunk overlap, embedding quality, HNSW + metadata filtering
- [Deepchecks: High-Performance RAG Pipelines](https://www.deepchecks.com/build-high-performance-rag-pipelines-scale/) -- 45% accuracy reduction from poor document processing
- [RAGFlow: From RAG to Context (2025 year-end review)](https://ragflow.io/blog/rag-review-2025-from-rag-to-context) -- Chunk size vs context tradeoff

### SaaS Business and Billing
- [ColorWhistle: SaaS Credits System Guide 2026](https://colorwhistle.com/saas-credits-system-guide/) -- Race conditions, partial credit transfers, metering accuracy
- [Alguna: Consumption-based pricing 2026](https://blog.alguna.com/consumption-based-pricing/) -- 1-5% revenue loss from billing errors
- [Growth Unhinged: State of SaaS Pricing](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes) -- 79 companies using credits, 126% YoY growth

### Node.js/Python Interop
- [Starbeamrainbowlabs: JS-Python IPC](https://starbeamrainbowlabs.com/blog/article.php?article=posts/549-js-python-ipc.html) -- stdin/stdout communication, no built-in IPC for non-JS processes
- [python-shell library](https://github.com/extrabacon/python-shell) -- Efficient inter-process communication through stdio
- [freeCodeCamp: Integrate Python with Node.js using child_process](https://www.freecodecamp.org/news/how-to-integrate-a-python-ruby-php-shell-script-with-node-js-using-child-process-spawn-e26ca3268a11/) -- Buffer flushing, spawn timing, error propagation

### Direct Operational Experience (Z4 Skill)
- Marp slide overflow: content exceeding slide boundaries, no vertical auto-scaling
- sed + dollar signs on Windows: backreference interpretation destroys `$` characters
- Blank line collapse breaking Markdown tables: `sed -i '/^$/N;/^\n$/d'` removes required whitespace
- Nano Banana Pro: intermittently ignores prompts entirely
- Google Slides API: rate limits hit during batch presentation creation

---
*Pitfalls research for: AI Presentation SaaS (SlideForge)*
*Researched: 2026-02-14*
