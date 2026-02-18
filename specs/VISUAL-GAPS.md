# Visual Gaps: Patterns from 50 Real Pitch Decks Not Yet Implemented

Based on analysis of ~50 startup pitch decks (Pre-Seed through Series A) from the Figma collection.
Source: `reference-decks/DESIGN-PATTERNS.md`

---

## 1. Device Mockup Frames for Product Screenshots

**Priority:** High
**Complexity:** Medium
**Pattern:** Real decks embed product screenshots inside device mockups (laptop frames, phone bezels) with drop shadows and realistic context. Currently, Marp places images flat via `![bg right:45%]`.

### Approach A: CSS-Based Device Frame (Recommended)
- Add a `.device-frame` CSS class that wraps the image area with:
  - Dark border-radius frame simulating a laptop bezel
  - Drop shadow (`box-shadow: 0 20px 60px rgba(0,0,0,0.3)`)
  - Subtle reflection gradient at the bottom
- Limitation: Marp `![bg]` images can't be wrapped in CSS containers. This requires moving product images from `![bg right]` syntax to inline `<img>` tags inside a positioned div.

### Approach B: Pre-Composite Device Frames
- Generate device mockup frames as transparent PNGs (laptop, phone, tablet)
- Composite product screenshots into the frames during image generation pipeline
- Store pre-composited images, then place them on slides normally

### Approach C: Marp Image Filter Chain
- Use Marp's built-in filters: `![bg right:45% drop-shadow](url)`
- Add CSS `border-radius` to the Marp background image layer
- Limited control but zero additional infrastructure

### Acceptance Criteria
- [ ] PRODUCT_SHOWCASE slides display images with device frame styling
- [ ] Frame adapts to image aspect ratio (landscape = laptop, portrait = phone)
- [ ] Drop shadow visible on dark backgrounds
- [ ] No change needed to LLM prompt or image generation

---

## 2. Circular Team Headshots

**Priority:** Medium
**Complexity:** Low (CSS) / High (image sourcing)
**Pattern:** Real team slides use circular headshot photos in a grid. Each person has a consistent-background circular photo with name/title/credentials beneath.

### Problem
AI image generators (Nano Banana Pro) produce poor headshots. The current TEAM slide type uses text-only cards with name, role, and credentials.

### Approach A: User-Uploaded Photos
- Add `teamMembers[]` field to Presentation model with `name`, `role`, `credentials`, `photoUrl`
- In the frontend, allow users to upload team member photos
- CSS: `.team-card img { border-radius: 50%; width: 80px; height: 80px; object-fit: cover; }`
- TEAM slide template pulls from this data instead of LLM generation

### Approach B: Avatar Placeholder Initials
- Generate colored circle with initials (CSS-only, no images needed)
- `.avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5em; font-weight: 700; color: #fff; }`
- LLM outputs `<div class="avatar">JS</div>` for "Jane Smith"

### Approach C: Specialized Headshot Generator
- Use a portrait-specific AI model (e.g., SDXL with portrait LoRA)
- Generate professional headshots from text descriptions
- Risk: uncanny valley, inconsistent style across team members

### Acceptance Criteria
- [ ] Team slides display visual representation for each member (photo or avatar)
- [ ] Circular crop/shape with consistent sizing
- [ ] Grid layout remains intact with 2-4 people per row

---

## 3. SVG Percentage Circles (Donut Charts)

**Priority:** Medium
**Complexity:** Medium
**Pattern:** Hopscotch deck displays stats as large colored circles (20%, 80%, 75%) with descriptors. This donut/circle pattern for statistics is visually powerful.

### Approach: Inline SVG in Marp Body
Generate SVG circles directly in the slide body markdown:

```html
<div class="stat-circles">
  <div class="circle-stat">
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10"/>
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" stroke-width="10"
              stroke-dasharray="251.3" stroke-dashoffset="50.3"
              transform="rotate(-90 60 60)"/>
      <text x="60" y="65" text-anchor="middle" fill="var(--accent)" font-size="28" font-weight="800">80%</text>
    </svg>
    <p>adoption rate</p>
  </div>
</div>
```

### Implementation Steps
1. Create `generatePercentageCircleSVG(value: number, accentColor: string): string` utility
2. Add `PERCENTAGE_CIRCLES` as a body format option for DATA_METRICS slides
3. LLM outputs `{ format: "circles", metrics: [{value: 80, label: "adoption"}] }`
4. Renderer converts to inline SVG before injecting into Marp markdown
5. Add scoped CSS for `.stat-circles` grid layout

### Acceptance Criteria
- [ ] Circular percentage visualization renders in Marp PDF/PPTX output
- [ ] SVG scales correctly within slide viewport
- [ ] Accent color from theme applies to circle stroke and text
- [ ] Works for 2-4 metrics per slide

---

## 4. Press Clipping / Social Proof Collages

**Priority:** Low
**Complexity:** High
**Pattern:** Hopscotch's "The crisis is getting worse by the day" slide arranges actual newspaper/journal clippings in a collage as evidence.

### Approach A: Publication Logo Grid
- Create a curated set of publication logos (NYT, WSJ, TechCrunch, Forbes, etc.) as small SVGs
- LLM selects relevant publications when generating PROBLEM slides with media evidence
- Render as a `.press-grid` CSS layout (similar to LOGO_WALL but styled as press clippings)

### Approach B: Headline Card Grid
- Format press mentions as styled cards with:
  - Publication name in small caps
  - Headline text in bold
  - Date in gray
- CSS: `.press-card { border-left: 3px solid var(--accent); padding: 8px 12px; }`

### Approach C: Screenshot-Based (Future)
- Accept user-uploaded press screenshots
- Arrange in a masonry/grid layout
- Most authentic but requires user input

### Acceptance Criteria
- [ ] PROBLEM slides can display press/media evidence visually
- [ ] Publication names render with consistent styling
- [ ] Grid layout supports 3-6 press mentions
- [ ] Falls back gracefully if no press data available

---

## 5. Company Logo on Every Slide

**Priority:** Medium
**Complexity:** Low
**Pattern:** Real pitch decks show a small company logo in the bottom-right (or bottom-left) corner of every slide. Logo size is small on content slides, large only on TITLE.

### Approach: Marp Footer with Logo
Marp supports `footer` directive in frontmatter which renders on every slide:

```yaml
footer: '![w:40](https://example.com/logo.png)'
```

### Implementation Steps
1. Add `logoUrl` field to `Presentation` model (optional)
2. Frontend: upload logo in deck settings
3. `marp-exporter.service.ts`: if `presentation.logoUrl` exists, add to frontmatter:
   ```
   footer: '![w:40](${logoUrl})'
   ```
4. CSS: position footer in bottom-right, 60% opacity, skip on TITLE/CTA slides
   ```css
   section footer { position: absolute; bottom: 16px; right: 24px; opacity: 0.6; }
   section.lead footer { display: none; }
   ```
5. PPTX exporter: add logo as small image on each slide (bottom-right, 0.5" x 0.5")

### Database Migration
```prisma
model Presentation {
  logoUrl    String?   // URL to company logo (uploaded to S3/Cloudflare R2)
}
```

### Acceptance Criteria
- [ ] Logo appears on every content slide (bottom-right, small, semi-transparent)
- [ ] Logo hidden on TITLE, CTA, and SECTION_DIVIDER slides
- [ ] Works in both Marp PDF and PPTX exports
- [ ] Optional: no logo = no footer (backward compatible)

---

## 6. Line Chart / Data Visualizations

**Priority:** High
**Complexity:** High
**Pattern:** Seek deck shows accuracy improvement as a line chart (0% to 72% over time). Real decks use simple, clean line charts with minimal gridlines for growth trends.

### Approach A: Mermaid.js Integration
Marp supports Mermaid diagrams natively with the mermaid CLI plugin:

```markdown
```mermaid
xychart-beta
  title "Revenue Growth"
  x-axis [Q1, Q2, Q3, Q4]
  y-axis "Revenue ($M)" 0 --> 5
  line [0.5, 1.2, 2.8, 4.2]
```
```

- Requires `@marp-team/marp-cli` with `--html` flag
- Mermaid xychart-beta supports line, bar, and scatter
- Limited styling options

### Approach B: Inline SVG Charts
Generate simple SVG line charts directly:

```html
<svg viewBox="0 0 400 200" width="100%">
  <polyline fill="none" stroke="var(--accent)" stroke-width="3"
            points="0,180 100,150 200,90 300,30 400,10"/>
  <!-- Axis labels, dots at data points, area fill -->
</svg>
```

- Full control over styling
- LLM outputs chart data as JSON, renderer generates SVG
- Complex to get right (axis scaling, labels, responsive sizing)

### Approach C: Chart Image Generation
- Use a chart rendering service (QuickChart API, Chart.js + Puppeteer)
- Generate chart as PNG, embed as image
- Most flexible but adds external dependency

### Implementation Steps (Approach B recommended)
1. Create `generateLineChartSVG(data: {labels: string[], values: number[]}, accent: string): string`
2. Add `CHART` body format option for DATA_METRICS slides
3. LLM outputs `{ format: "chart", chartType: "line", data: {...} }`
4. Renderer generates SVG, injects into slide body
5. Handle axis scaling, labels, and responsive sizing

### Acceptance Criteria
- [ ] Simple line charts render correctly in Marp PDF output
- [ ] Chart uses theme accent color for data line
- [ ] Axis labels readable at slide zoom levels
- [ ] Supports at least line and bar chart types
- [ ] Clean, minimal style matching real pitch deck aesthetics (no heavy gridlines)
