# Presentation Design — Death-Proof Slide Principles

Presentation content generation skill that enforces visual design principles derived from David JP Phillips' "How to Avoid Death By PowerPoint" and Z4 production-grade PPTX output.

## When to Use This Skill

- Generating slide outlines or slide content for presentations
- Reviewing slide content for density/readability violations
- Writing system prompts for LLM-based slide generation
- Evaluating PPTX export quality
- Any pitch deck or presentation generation task

## The 5 Core Principles (David JP Phillips)

### 1. One Message Per Slide
Every slide communicates exactly ONE idea. If you need a second idea, make a second slide. The audience retains the single message, not a wall of text.

**Enforcement:** `maxConceptsPerSlide: 1` in density-validator. Each slide's body serves one thesis statement.

### 2. No Sentences on Slides (Kill Redundancy)
Never put on the slide what the speaker will say. Slides are VISUAL AIDS, not teleprompters. Put detail in speaker notes — the slide shows the headline.

**Enforcement:**
- Max 80 words per slide body (including table cells)
- Max 12 words per bullet point
- Lead sentences max 20 words
- Speaker notes hold the expanded explanation (2-4 sentences)

### 3. Size Signals Importance
The most important element should be the largest. In our PPTX layout:
- Title: 28pt (slide type label)
- Key metric / hero number: rendered in accent color via **bold**
- Body text: 14pt
- Sources: 8pt (least important, smallest)

**Enforcement:** Font size hierarchy is hardcoded in pptxgenjs-exporter. Never let body text exceed title size.

### 4. Contrast Directs Focus
Dark background + light text creates cinematic contrast. Accent color (cyan) draws the eye to the ONE thing you want the audience to see.

**Enforcement:**
- Background: slate-900 (#0f172a)
- Text: white (#f8fafc)
- Accent/bold: cyan-400 (#22d3ee) — used on **bold** text, table headers, accent lines
- `**bold**` in body text renders in accent color, creating visual hierarchy without extra elements

### 5. Maximum 6 Objects Per Slide
Working memory holds 6 items. Each bullet, table row, image, shape, or text block counts as one object.

**Enforcement:**
- Max 5 bullets (leaves room for title + takeaway = 7 objects, close to limit)
- Max 5 table rows (header + 4 data rows + title + takeaway)
- Tables preferred over bullets (one table = one visual object vs. 5 separate bullets)

## Slide Density Rules

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Words per slide | 80 | Audience reads ahead; fewer words = more listening |
| Bullets per slide | 5 | 6-object working memory limit |
| Words per bullet | 12 | Scannable in <2 seconds |
| Table rows | 5 | Header + 4 data rows fits without scroll |
| Table columns | 2-3 | More columns = smaller text = harder to read |
| Concepts per slide | 1 | One message retained, two messages = zero retained |
| Lead sentence | 20 words max | Sets context without becoming a paragraph |
| Key takeaway (###) | 10 words max | Memorable punchline |
| Nested list depth | 1 | Flat hierarchy only |

## Content Architecture by Slide Type

### DATA_METRICS
- Lead with the hero number in **bold** (one sentence)
- Table with 2 columns (Metric | Value), max 4 data rows
- Key takeaway interprets what the numbers mean
- Sources line

### PROCESS
- Lead sentence naming the process
- 4 numbered steps, each starting with **bold** action verb
- Each step max 8 words after the verb
- Key takeaway about the process benefit

### COMPARISON
- Lead sentence with the delta (e.g., "89% cost reduction")
- Table: 3 columns (Dimension | Before | After), max 4 rows
- OR: Two bullet groups separated by blank line (Before/After headers)
- Key takeaway about the winner

### PROBLEM / SOLUTION
- Lead sentence with the cost/impact in **bold**
- Table: 2 columns (Pain Point | Impact) or (Capability | Outcome)
- Max 3-4 rows — prioritize the most shocking data
- Key takeaway frames urgency (problem) or value (solution)

### TITLE
- 2-3 tagline phrases (NOT bullets)
- No table, no sources, no takeaway
- Subtitle in accent color

### CTA
- 2-3 action bullets with **bold** verbs
- Max 8 words per bullet
- No table needed

## Speaker Notes Strategy

All the detail the audience doesn't see on the slide goes into speaker notes:
- Expanded context for each data point
- Transition phrases to the next slide
- Anticipated questions and answers
- Supporting evidence that didn't make the cut

## Z4 Visual Layout Reference

- Slide dimensions: 13.33" x 7.5" (LAYOUT_WIDE 16:9)
- Title zone: y=0.4, h=0.7 (top 15%)
- Body zone: y=1.2, maxH=52% (middle 52%)
- Footer zone: y=93% (bottom 7%)
- Safety margin: 4% gap between body bottom and footer
- Accent line: 1.5" wide, 0.04" tall, primary color, above title
- Font: body=14pt, title=28pt, source=8pt, H3=14pt

## Anti-Patterns (NEVER Do)

1. **Wall of text**: More than 80 words on a slide
2. **Bullet soup**: More than 5 bullets
3. **Sentence bullets**: Bullets longer than 12 words
4. **Redundant narration**: Slide text matches speaker notes verbatim
5. **Missing hierarchy**: All text same size/color — no bold, no accent
6. **Data without context**: Raw numbers without a takeaway interpretation
7. **Overflow**: Content that pushes past the 52% body zone into the footer
8. **Generic assertions**: "AI is transforming industries" — always cite specific numbers from KB
