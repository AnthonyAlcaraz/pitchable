# Domain Pitfalls: SlideForge

**Domain:** AI Presentation Generation SaaS
**Researched:** 2026-02-14
**Overall Confidence:** MEDIUM-HIGH (most findings verified across multiple sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, user churn, or fundamental product failure.

---

### CP-1: The "Gamma Problem" -- Ugly Output Kills Trust Instantly

**What goes wrong:** AI-generated slides look amateurish. Users see one bad slide and abandon the product. The most common complaints across Gamma, SlidesAI, and Plus AI reviews: broken layouts, mismatched fonts, repetitive "AI look" across every deck, and images that have zero relevance to the content. Gamma currently holds a 1.9/5 on Trustpilot, with design quality and export formatting as top complaints.

**Why it happens:** Most AI presentation tools treat design as an afterthought. They generate content first, then attempt to style it. Without hard constraints, LLMs produce slides that violate basic design principles: too many bullet points, clashing colors, inconsistent font sizes, walls of text, and random stock imagery.

**Consequences:** Users generate one deck, see it looks worse than what they could make manually in 15 minutes, and never return. First-impression failure is the #1 killer for AI presentation tools.

**Prevention:** The design constraint engine must be a first-class system, not a styling layer applied after content generation. Every slide must pass through validation rules BEFORE reaching the user. This is SlideForge's stated core differentiator and must be built in Phase 1, not bolted on later.

**Detection:** Monitor the percentage of generated slides that violate any design rule. If this number is above 0% in production, the constraint engine has gaps.

**Confidence:** HIGH -- verified across multiple user review platforms and competitor analyses.

**Phase:** Must be addressed in the foundation phase (Phase 1). The constraint engine is the product.

---

### CP-2: Content Density Overflow -- The Wall-of-Text Slide

**What goes wrong:** LLMs are verbose by nature. Without hard limits, they generate slides with 8+ bullet points, each containing full sentences, in 16px font. The result is a wall of text that nobody can read from the back of a room.

**Why it happens:** LLMs optimize for completeness, not visual hierarchy. When asked to "create a slide about X," they dump everything they know. The 6x6 rule (max 6 bullets, max 6 words per bullet) and 10-20-30 rule (minimum 30pt font) are fundamental presentation design laws that LLMs violate by default.

**Consequences:** Slides that look like documents. Audiences disengage. Presenters are embarrassed. Users blame the tool.

**Prevention:** Hard-coded constraints in the generation pipeline:
- Maximum 6 bullet points per slide
- Maximum 10 words per bullet point
- Minimum font size of 24pt (28pt+ preferred)
- Maximum character count per slide (varies by layout: title-only = 50 chars, title + bullets = 200 chars, title + image + bullets = 150 chars)
- Auto-split: if content exceeds limits, split into multiple slides rather than shrinking text
- Word count validation on every slide BEFORE rendering

**Detection:** Count bullet points and word counts on every generated slide. Alert if any slide exceeds thresholds.

**Confidence:** HIGH -- the 6x6 and 10-20-30 rules are industry-standard presentation design principles documented across Microsoft, Cornell, and every presentation design guide.

**Phase:** Phase 1 (constraint engine core).

---

### CP-3: Color Combination Disasters -- Accessibility and Aesthetics

**What goes wrong:** AI generates slides with color combinations that are illegible, ugly, or inaccessible. Specific failures: red text on green background (invisible to 8% of men), yellow text on white (fails WCAG contrast), neon green on neon pink (assault on eyes), light gray on white (invisible to everyone).

**Why it happens:** LLMs do not understand color theory. If given a free choice, they will suggest colors that sound reasonable in text ("red for urgency, green for growth") but fail in practice. Without a validated palette system, every generation is a gamble.

**Consequences:** Slides that cannot be read by colorblind users (8% of male audience). Slides that look unprofessional. Slides where text literally disappears against the background on projected screens (projectors wash out low-contrast combinations).

**Prevention:** Implement a color constraint system with three layers:

1. **Banned combinations (hard block):** See section "Excluded Design Combinations" below
2. **WCAG contrast validation:** Every text-background pair must pass WCAG AA minimum (4.5:1 for body text, 3:1 for large text / 24pt+)
3. **Curated palette system:** Users select from pre-validated palettes rather than arbitrary colors. Each palette is tested for all color-blindness variants (protanopia, deuteranopia, tritanopia)

**Detection:** Run automated WCAG contrast checks on every generated slide. Flag any slide below 4.5:1 ratio. Use tools like the WebAIM Contrast Checker algorithm.

**Confidence:** HIGH -- WCAG 2.1 SC 1.4.3 defines exact ratios. Color blindness statistics from National Eye Institute.

**Phase:** Phase 1 (constraint engine core).

---

### CP-4: Export Format Fidelity -- "It Looked Fine Until I Downloaded It"

**What goes wrong:** Slides render beautifully in the web app but break on export. Specific failures by format:

**Marp CLI (Markdown to PDF/PPTX):**
- Regular PPTX output consists of pre-rendered background images -- content is NOT editable in PowerPoint
- `--pptx-editable` is experimental, throws errors with complex themes (including Marp Core's `gaia` theme), and does NOT support presenter notes
- Firefox PDF output has incompatible renderings vs. Chrome
- Local file access (images) is blocked by default; requires `--allow-local-files` flag which has security implications
- Standalone binaries cannot load ES Module configuration files

**python-pptx (direct PPTX generation):**
- No support for animations or transitions
- No SmartArt support
- Font formatting gets reset to defaults during text replacement operations
- Generated files sometimes trigger "PowerPoint found a problem with content" repair dialogs
- Only supports .pptx format (not legacy .ppt)

**Google Slides API:**
- Write requests limited to 600/minute/project and 60/minute/user
- Read requests limited to 3,000/minute/project
- OAuth new user authorization has rate limits (can block rapid signups)
- Exceeding quotas returns 429 errors requiring exponential backoff
- OAuth scope risk levels affect available quota caps

**Why it happens:** Each export format has its own rendering engine with different capabilities. What CSS can express is not what PPTX XML can express. Teams build for one format first and discover the others break.

**Consequences:** Users generate a presentation, download it, open it in PowerPoint, and find broken layouts, missing fonts, uneditable content, or repair warnings. This destroys trust as thoroughly as ugly design.

**Prevention:**
- Build export validation tests for every supported format from day one
- Use python-pptx for PPTX generation (not Marp's --pptx-editable) since direct XML generation gives more control
- For Google Slides: implement proper rate limiting with exponential backoff, queue system for batch operations, and handle OAuth carefully
- Test every slide template in every export format before launching that template
- Limit design features to the intersection of what ALL export formats support (lowest common denominator for cross-format features)

**Detection:** Automated visual regression tests: render each slide in web, export to each format, screenshot the result, compare pixel differences. Alert on >5% deviation.

**Confidence:** HIGH for Marp and Google Slides limits (verified from official docs). MEDIUM for python-pptx (verified from GitHub issues and docs).

**Phase:** Phase 2 (export pipeline), but template design in Phase 1 must account for export constraints.

---

### CP-5: Image Generation Cost Explosion

**What goes wrong:** Image generation APIs charge per image. At scale, costs spiral out of control. A user generating a 12-image presentation costs $0.48-$0.96 in image generation alone (at $0.04-$0.08/image for DALL-E 3 / Flux Pro). If the user is on a $10/month plan generating 20 presentations, image costs alone are $9.60-$19.20 -- exceeding revenue.

**Why it happens:** Teams price based on subscription models without modeling per-generation variable costs. Image generation is not like LLM tokens (fractions of a cent); it is 4-8 cents per image, and users choose 12 images per deck because "more is better."

**Consequences:** Negative unit economics. Every active user loses money. The more successful the product, the faster it burns cash.

**Prevention:**
- **Tiered image credits:** Free = 0 images, Basic = 3/deck, Pro = 12/deck. Credits are the monetization lever.
- **Cost modeling per tier:** Model the worst-case cost per user per month for each plan before setting prices
- **Image caching:** Cache generated images with their prompts. If two users generate "professional team meeting" for the same template, serve the cached version.
- **Model routing:** Use Flux.1 Schnell (cheapest, fastest) for preview/draft, Flux Pro or DALL-E 3 only for final export
- **Self-hosted fallback:** At >10K images/day, self-hosting Flux or Stable Diffusion on GPU instances ($1.29-$2.99/hr for A100/H100) becomes cheaper than API pricing. Plan the migration path.
- **Usage-based pricing:** 61% of SaaS companies now use usage-based pricing. For AI-heavy products, this is essential to protect margins.

**Detection:** Track cost-per-generation and cost-per-user-per-month in real-time. Alert if any plan's average cost exceeds 40% of revenue.

**Confidence:** HIGH for pricing data (verified from official API pricing pages). The margin math is straightforward arithmetic.

**Phase:** Phase 1 (pricing model), Phase 3 (image generation integration), Phase 5+ (self-hosting optimization).

---

### CP-6: AI Image Text Rendering Failure

**What goes wrong:** Users expect AI-generated images to contain readable text (chart labels, diagram text, title graphics). DALL-E 3 warps, duplicates, and misspells text in generated images. Even Flux, which handles text better, fails on complex multi-word strings. Generated images with garbled text look worse than no image at all.

**Why it happens:** Diffusion models generate images pixel-by-pixel and do not have a concept of "characters" or "spelling." Text rendering requires pixel-perfect placement that conflicts with the stochastic nature of image generation.

**Consequences:** Slides with images containing gibberish text. Users see "Annuall Revnue Grwoth" in a generated chart image and lose all confidence in the product.

**Prevention:**
- **Never generate text inside images.** This is the golden rule. All text belongs in the slide layer, not the image layer.
- **Use images as backgrounds/illustrations only.** Generate scenes, objects, abstract visuals -- never charts, diagrams, or text-containing graphics.
- **Prompt engineering:** Explicitly include "no text, no words, no labels, no letters" in every image generation prompt.
- **Post-generation validation:** Run OCR on generated images. If any text is detected, flag for regeneration with stronger no-text prompts.
- **For charts/diagrams:** Generate them programmatically (Chart.js, D3, Mermaid) rather than through image AI.

**Detection:** OCR scan every generated image before serving. If detected text confidence > 0.7, regenerate.

**Confidence:** HIGH -- text rendering failures in DALL-E are extensively documented. Flux/Ideogram improvements are real but not reliable enough for professional use.

**Phase:** Phase 3 (image generation). This constraint must be designed into the prompt system from the start.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### MP-1: Knowledge Base Ingestion Garbage-In-Garbage-Out

**What goes wrong:** Users upload PDFs, Word docs, and other files to build a knowledge base. The parsing pipeline mangles the content: tables lose their structure, multi-column layouts merge incorrectly, headers and footers pollute the body text, images are lost, and formatting metadata (bold, headings) is stripped.

**Why it happens:** PDF is a page-description format, not a semantic format. Text is stored as drawing commands, not in reading order. Tables have no explicit structure in most PDFs. Multi-column layouts create interleaved text blocks. Even the best parsers (PyMuPDF, pdfplumber) struggle with complex layouts. VLM-based approaches (using vision models to "read" PDFs) hallucinate content and miss embedded text.

**Prevention:**
- Use PyMuPDF or pypdfium for text extraction (best accuracy in comparative studies)
- Use pdfplumber specifically for table extraction (it handles table structure better than general-purpose parsers)
- For complex documents, offer a "review extracted content" step where users can verify and correct parsed content before presentation generation
- Support direct text input and markdown as first-class alternatives to PDF upload
- Display confidence scores for parsed sections so users know which content might be mangled

**Detection:** Compare input document page count and approximate word count against extracted content. Large discrepancies (>20% content loss) indicate parsing failures.

**Confidence:** HIGH -- PDF parsing challenges are extensively documented. NVIDIA, Unstructured, and the arXiv comparative study all confirm these limitations.

**Phase:** Phase 2 (knowledge base ingestion).

---

### MP-2: Chunking Strategy Destroys Context

**What goes wrong:** When indexing knowledge base content for RAG retrieval, naive fixed-size chunking (e.g., "every 512 tokens") splits content at arbitrary boundaries. A procedure gets cut in half. A table header separates from its data rows. A conclusion loses its supporting evidence.

**Why it happens:** 70% of enterprise teams still use fixed-size chunking despite extensive evidence that it produces inferior results. It is the default in most RAG frameworks and the easiest to implement.

**Prevention:**
- Use semantic chunking (split at paragraph/section boundaries) instead of fixed-size chunking
- Preserve table integrity: never split a table across chunks
- Include section headers in every chunk for context
- Use overlapping chunks (10-20% overlap) to prevent hard boundary artifacts
- Adaptive chunking achieves 87% accuracy vs. 50% for naive approaches (NVIDIA study)

**Detection:** Sample retrieval queries and check if returned chunks are self-contained and coherent. If chunks frequently start mid-sentence or mid-paragraph, the strategy needs fixing.

**Confidence:** HIGH -- verified across NVIDIA, Weaviate, Stack Overflow, and Databricks documentation.

**Phase:** Phase 2 (knowledge base indexing).

---

### MP-3: Image Style Inconsistency Across Slides

**What goes wrong:** Each slide's image is generated independently, producing a deck where slide 1 has a photorealistic image, slide 3 has a watercolor illustration, and slide 7 has a flat vector graphic. The deck looks like a collage assembled by five different designers.

**Why it happens:** Image generation models produce varied outputs even with similar prompts. Without explicit style anchoring, each generation drifts. Seed values and style prompts help but do not guarantee consistency.

**Prevention:**
- **Style parameter system:** Define a style string (e.g., "flat illustration, blue and white palette, clean lines, corporate style") that is prepended to every image prompt in a deck
- **Seed consistency:** Use the same random seed for all images in a deck (where API supports it)
- **Style reference image:** Generate one "anchor" image first, then use image-to-image or style transfer for subsequent images
- **Limited style presets:** Offer 5-8 curated style options rather than free-form style input. Each preset includes tested prompt prefixes that produce consistent results.

**Detection:** Generate a 10-slide deck and visually compare all images. If style coherence is not immediately apparent, the system needs tuning.

**Confidence:** MEDIUM -- style consistency techniques are well-documented but their reliability varies by model and API.

**Phase:** Phase 3 (image generation pipeline).

---

### MP-4: Image Generation Latency Destroys UX

**What goes wrong:** A 12-image deck takes 60-120 seconds to generate images sequentially. Users stare at a spinner, assume the app is broken, and close the tab. Nielsen Norman Group research establishes that users lose attention focus after 10 seconds of waiting.

**Why it happens:** Each image generation call takes 5-15 seconds via API. Sequential generation of 12 images = 60-180 seconds total. Mobile devices add another 15-20% to perceived latency.

**Prevention:**
- **Parallel generation:** Fire all image requests concurrently (watch API rate limits)
- **Progressive rendering:** Show slides with placeholder images immediately, then swap in generated images as they complete. Users can start reviewing text content while images load.
- **Two-phase generation:** Generate the deck with text-only first (fast, < 5 seconds). Let users review/edit content. Then generate images as a separate "enhance" step with a progress bar.
- **Skeleton loading:** Show image-shaped skeletons with shimmer animation, not blank spaces or spinners
- **Pre-generation:** For common templates (e.g., "company introduction"), pre-generate a library of generic images that can be served instantly and replaced with custom ones in the background.

**Detection:** Measure p50 and p95 time-to-first-visible-slide and time-to-complete-deck. If p95 exceeds 30 seconds for text-only and 120 seconds for full deck with images, optimize.

**Confidence:** HIGH -- Nielsen Norman Group response time research is canonical. API latency ranges verified from provider documentation and community reports.

**Phase:** Phase 3 (image generation), Phase 4 (UX optimization).

---

### MP-5: Free Tier and Credit System Abuse

**What goes wrong:** Users create multiple accounts with disposable emails to farm free credits. Bot scripts automate presentation generation to extract AI-generated content. Competitors use free tier to benchmark your output quality at scale.

**Why it happens:** Any product offering AI-generated output for free attracts abuse. Disposable email services make multi-account creation trivial. The cost of abuse falls entirely on the provider (LLM tokens + image generation costs).

**Prevention:**
- **Email validation:** Block disposable email domains (maintain a blocklist, services like Clearout provide this)
- **Device fingerprinting:** Track browser/device fingerprints to detect same-device multi-account creation
- **Rate limiting per IP:** Cap generations per IP address per day
- **Phone verification for free tier:** Require SMS verification to activate free credits (highest friction but most effective)
- **Behavioral monitoring:** Flag accounts that generate maximum allowed presentations immediately after signup with no editing/reviewing behavior
- **Generous but bounded free tier:** Give enough to evaluate the product (3-5 presentations) but not enough to replace paying (no images on free tier is the strongest lever)

**Detection:** Monitor account creation velocity from same IP/fingerprint. Flag accounts that consume all credits within 1 hour of creation.

**Confidence:** HIGH -- SaaS abuse patterns are well-documented by Togai, AWS, and Paddle.

**Phase:** Phase 4 (billing and auth system).

---

## Minor Pitfalls

Mistakes that cause annoyance or small delays but are recoverable.

---

### mP-1: Font Availability Across Export Formats

**What goes wrong:** The web app renders slides with Google Fonts (Inter, Poppins, etc.), but exported PPTX files open on machines that do not have those fonts installed. PowerPoint substitutes Arial or Calibri, destroying the typography.

**Prevention:**
- Use only fonts bundled with the export format (Calibri, Arial, Georgia for PPTX)
- Alternatively, embed fonts in PPTX files (increases file size but guarantees consistency)
- For web-only formats (Reveal.js, PDF), Google Fonts are safe since they render during export

**Confidence:** MEDIUM -- font embedding in PPTX is supported but adds complexity.

**Phase:** Phase 1 (template design must account for this).

---

### mP-2: Reveal.js Presentation Portability

**What goes wrong:** Reveal.js presentations are HTML/CSS/JS bundles. Users who download them may not know how to serve them locally. Double-clicking `index.html` may not work due to CORS restrictions on local file access.

**Prevention:**
- Export as a single self-contained HTML file (inline all CSS/JS/images as base64)
- Provide a "present online" hosted option alongside download
- Include a one-line instruction: "Open in any web browser" or provide a tiny local server script

**Confidence:** MEDIUM -- standard web development knowledge.

**Phase:** Phase 2 (export pipeline).

---

### mP-3: Google Slides OAuth Token Management

**What goes wrong:** OAuth tokens expire. Users connect their Google account, generate presentations for a week, then the token expires and they see an auth error. Refresh token handling fails silently, and presentations fail to export.

**Prevention:**
- Implement proper refresh token rotation
- Test token expiry paths explicitly (force-expire in test environment)
- Show clear UI when re-authorization is needed, not a cryptic error
- Store refresh tokens securely (encrypted at rest)

**Confidence:** HIGH -- OAuth token expiry is a standard issue with well-documented solutions.

**Phase:** Phase 2 (Google Slides integration).

---

## Excluded Design Combinations

Specific rules that the constraint engine MUST enforce. These are not suggestions; they are hard blockers that prevent generation of slides violating them.

---

### Banned Color Pairs

These combinations must NEVER appear as text-on-background or foreground-on-background in any generated slide.

| Text Color | Background Color | Why Banned |
|-----------|-----------------|------------|
| Red | Green | Invisible to 8% of male population (deuteranopia). Both appear as muddy brown. |
| Green | Red | Same as above, reversed. |
| Red | Black | Users with protanopia perceive red as black. Text disappears. |
| Green | Black | Users with deuteranopia see green as very dark, near-black. |
| Blue | Purple | Indistinguishable for tritanopia. Also low contrast for normal vision. |
| Green | Brown | Nearly identical for red-green color blindness. |
| Green | Gray | Indistinguishable for deuteranopia. |
| Blue | Gray | Low contrast, problematic for tritanopia. |
| Yellow | White | Fails WCAG contrast (ratio ~1.07:1). Invisible to all users. |
| Light Gray | White | Fails WCAG contrast. Invisible on projectors. |
| Cyan | White | Fails WCAG contrast (ratio ~1.25:1). |
| Neon Green | Neon Pink | Visually aggressive, causes eye fatigue. Unprofessional. |
| Neon Yellow | Neon Orange | Near-identical hue, no contrast. |
| Orange | Red | Insufficient hue differentiation for color-blind users. |
| Pastel Pink | Pastel Yellow | Fails WCAG contrast on both AA and AAA. |

**Implementation rule:** Every text-background pair must pass WCAG AA contrast ratio (4.5:1 for text <24pt, 3:1 for text >=24pt). Run the WebAIM contrast algorithm on every generated slide. Reject and re-palette any slide that fails.

**Safe default pairs (always allowed):**
- White text on dark navy (#1a1a2e) -- ratio 15.6:1
- Dark charcoal (#333333) on white (#ffffff) -- ratio 12.6:1
- White text on dark teal (#006666) -- ratio 7.2:1
- Navy (#003366) on light gray (#f0f0f0) -- ratio 10.1:1

---

### Banned Font Choices

These fonts must NEVER be used in any generated slide, regardless of user request.

| Font | Why Banned |
|------|-----------|
| Comic Sans MS | Universally perceived as unprofessional. Destroys credibility of any business presentation. |
| Papyrus | Same as above. Strongly associated with amateur design. |
| Bradley Hand | Childlike handwriting font. Illegible at small sizes. Unprofessional. |
| Mistral | Jagged, inconsistent strokes. Poor readability. Dated aesthetic. |
| Curlz MT | Decorative, illegible, and cartoonish. |
| Jokerman | Extremely decorative, unreadable, unprofessional. |
| Bleeding Cowboys | Grunge aesthetic. Illegible. Inappropriate for any business context. |
| Impact | Associated with memes. Overused. Unprofessional outside of specific creative contexts. |
| Courier New (as body text) | Monospace fonts are designed for code, not slide content. |
| Any decorative/display font as body text | Display fonts are designed for headlines at large sizes only. |

**Banned font pairings (even if individual fonts are allowed):**

| Heading Font | Body Font | Why Banned |
|-------------|-----------|-----------|
| Two serif fonts | (e.g., Times + Georgia) | Insufficient visual contrast. Hard to establish hierarchy. |
| Two script/handwritten fonts | (any combination) | Illegible, chaotic. No hierarchy. |
| Two display/decorative fonts | (any combination) | Visual noise. Neither reads as body text. |
| Same font for heading and body at similar sizes | (any font) | No visual hierarchy. All text looks equally important. |

**Approved font pairings (safe defaults):**

| Heading | Body | Style |
|---------|------|-------|
| Montserrat (Bold) | Open Sans (Regular) | Modern corporate |
| Playfair Display | Source Sans Pro | Elegant professional |
| Roboto Slab | Roboto | Technical/data-driven |
| Poppins (SemiBold) | Inter (Regular) | Clean startup |
| Lato (Bold) | Merriweather | Warm professional |

---

### Banned Layout Combinations

| Layout Pattern | Why Banned |
|---------------|-----------|
| Full-bleed image with white text and no overlay | Text is illegible over busy image regions. Require 30-50% dark overlay minimum. |
| More than 2 text columns on a single slide | Audiences cannot track 3+ columns from a distance. Splits attention. |
| Centered body text exceeding 3 lines | Centered text is harder to read in blocks. Use left-aligned for body text >3 lines. |
| Image + text where text covers >30% of image | Image becomes unrecognizable. Text becomes illegible. |
| Slide with no visual hierarchy (all same font size) | Audience cannot identify the key point. Require at least title/body size differentiation. |
| More than 3 font sizes on a single slide | Visual chaos. Limit to title, body, and caption sizes. |
| Pie chart image with >7 segments | Segments become too thin to distinguish. Switch to bar chart or grouped categories. |
| Slide with >3 distinct colors (excluding neutrals) | Color overload. Limit to primary, secondary, and accent. |

**Image-over-text rules:**
- All text placed over images MUST have either a dark scrim overlay (min 40% opacity black/navy) OR a solid-color text box behind the text
- The contrast ratio between text and its immediate background (overlay or box) must meet WCAG AA
- Blur effects on the image region behind text are acceptable as supplements but NOT as replacements for contrast overlays

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Phase 1: Design Engine | Treating constraints as "nice to have" rather than core product | Build constraint validation as the FIRST thing. Every feature adds constraints, not removes them. | Critical |
| Phase 1: Template Design | Designing templates without testing in all export formats | Test every template in PPTX, Google Slides, PDF, and Reveal.js before finalizing | Critical |
| Phase 2: Document Parsing | Assuming PDF parsing "just works" | Budget 2-3x expected time for parsing edge cases. Tables and multi-column layouts will break. | High |
| Phase 2: RAG Chunking | Using default fixed-size chunking | Implement semantic chunking from day one. Switching later requires re-indexing everything. | High |
| Phase 3: Image Generation | Allowing text in generated images | Hard-block text generation in images from the start. Add "no text" to every prompt. | Critical |
| Phase 3: Image Costs | Not modeling per-generation costs before pricing | Model worst-case image costs per plan tier before launching pricing. | Critical |
| Phase 3: Image Latency | Sequential image generation | Implement parallel generation + progressive rendering from the start. | High |
| Phase 4: Auth/Billing | Soft-launching without abuse prevention | Ship email validation, rate limiting, and device fingerprinting with the billing system, not after. | Medium |
| Phase 4: Google OAuth | Not testing token refresh paths | Force-expire tokens in staging and verify the entire re-auth flow works smoothly. | Medium |
| Phase 5: Scale | API costs growing linearly with users | Plan self-hosted image generation migration path when you cross 10K images/day. | High |

---

## Sources

### Design Quality and Accessibility
- [WCAG 2.1 SC 1.4.3: Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) -- HIGH confidence
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) -- HIGH confidence
- [Penn State: Problematic Combinations for Color Deficient Vision](https://accessibility.psu.edu/color/colorvisiondetails/) -- HIGH confidence
- [Microsoft 10-20-30 Rule](https://www.microsoft.com/en-us/microsoft-365-life-hacks/presentations/10-20-30-rule-of-powerpoint) -- HIGH confidence
- [Cornell: Presentation Slides Avoid Bullets](https://chec.engineering.cornell.edu/presentation-slides-avoid-bullets/) -- HIGH confidence
- [NN/G: Ensure High Contrast for Text Over Images](https://www.nngroup.com/articles/text-over-images/) -- HIGH confidence
- [Smashing Magazine: Best Practices of Combining Typefaces](https://www.smashingmagazine.com/2010/11/best-practices-of-combining-typefaces/) -- HIGH confidence

### AI Presentation Tools -- Competitor Issues
- [Gamma Reviews on Trustpilot](https://www.trustpilot.com/review/gamma.app) -- HIGH confidence (direct user reviews)
- [Gamma Reviews on Product Hunt](https://www.producthunt.com/products/gamma-3/reviews) -- HIGH confidence
- [Zapier: Best AI Presentation Makers 2026](https://zapier.com/blog/best-ai-presentation-maker/) -- MEDIUM confidence
- [eesel.ai: Deep Dive into Gamma Reviews](https://www.eesel.ai/blog/gamma-reviews) -- MEDIUM confidence

### PDF Parsing
- [NVIDIA: Approaches to PDF Data Extraction](https://developer.nvidia.com/blog/approaches-to-pdf-data-extraction-for-information-retrieval/) -- HIGH confidence
- [arXiv: Comparative Study of PDF Parsing Tools](https://arxiv.org/html/2410.09871v1) -- HIGH confidence
- [Seattle Data Guy: Challenges Parsing PDFs with Python](https://www.theseattledataguy.com/challenges-you-will-face-when-parsing-pdfs-with-python-how-to-parse-pdfs-with-python/) -- MEDIUM confidence

### RAG and Chunking
- [NVIDIA: Finding the Best Chunking Strategy](https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/) -- HIGH confidence
- [Stack Overflow: Breaking Up is Hard to Do -- Chunking in RAG](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/) -- MEDIUM confidence
- [ragaboutit.com: Semantic Boundaries Cut RAG Errors by 60%](https://ragaboutit.com/the-chunking-strategy-shift-why-semantic-boundaries-cut-your-rag-errors-by-60/) -- LOW confidence (single source)

### Image Generation
- [WaveSpeedAI: Complete Guide to AI Image Generation APIs 2026](https://wavespeed.ai/blog/posts/complete-guide-ai-image-apis-2026/) -- MEDIUM confidence
- [getimg.ai: FLUX.1 vs DALL-E 3](https://getimg.ai/blog/flux-1-vs-dall-e-3-what-is-the-best-ai-text-to-image-model) -- MEDIUM confidence
- [ImagineArt: AI Image Generation Costs 2026](https://www.imagine.art/blogs/ai-image-generation-cost) -- MEDIUM confidence

### Export Formats
- [Marp CLI GitHub](https://github.com/marp-team/marp-cli) -- HIGH confidence (official documentation)
- [python-pptx Documentation](https://python-pptx.readthedocs.io/) -- HIGH confidence (official docs)
- [Google Slides API Usage Limits](https://developers.google.com/workspace/slides/api/limits) -- HIGH confidence (official docs)
- [python-pptx SmartArt Issue #83](https://github.com/scanny/python-pptx/issues/83) -- HIGH confidence (official tracker)
- [python-pptx Animation Issue #400](https://github.com/scanny/python-pptx/issues/400) -- HIGH confidence (official tracker)

### SaaS Business
- [Togai: SaaS Free Trial Abuse Prevention](https://www.togai.com/blog/saas-free-trial-abuse-prevention/) -- MEDIUM confidence
- [AWS: Preventing Free Trial Abuse](https://aws.amazon.com/blogs/architecture/preventing-free-trial-abuse-with-aws-managed-services/) -- HIGH confidence
- [NN/G: Response Times -- 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) -- HIGH confidence
- [Monetizely: Economics of AI-First B2B SaaS 2026](https://www.getmonetizely.com/blogs/the-economics-of-ai-first-b2b-saas-in-2026) -- MEDIUM confidence
