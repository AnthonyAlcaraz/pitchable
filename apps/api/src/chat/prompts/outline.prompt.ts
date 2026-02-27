import type { SlideType } from '../../../generated/prisma/enums.js';

export interface OutlineSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  slideType: SlideType;
  sectionLabel?: string;
  sources?: string[];  // document titles that informed this slide's content
}

export interface GeneratedOutline {
  title: string;
  slides: OutlineSlide[];
  sources?: Array<{ documentTitle: string; documentId: string }>;  // deck-level KB sources
}

export function buildOutlineSystemPrompt(
  presentationType: string,
  slideRange: { min: number; max: number },
  kbContext: string,
  pitchLensContext?: string,
  archetypeContext?: string,
): string {
  return `You are Pitchable, an AI presentation architect. Generate a structured outline for a ${presentationType} presentation.

Your goal is to create a dense, data-rich, visually varied deck like a top-tier analyst briefing.

CONSTRAINTS:
- Between ${slideRange.min} and ${slideRange.max} slides total (HARD LIMIT — do not exceed ${slideRange.max})
- Each slide must have 3-5 bullet points maximum
- Each bullet should be a specific claim, data point, or source-backed assertion — NOT a generic topic label
- Include exact numbers, percentages, currency values, and named sources in bullets whenever available
- If the knowledge base provides a relevant statistic, include the exact number in the bullet
- Slide 1 must be type TITLE
- Last slide must be type CTA
- 1 key concept per slide
- Vary slide types for visual interest — avoid consecutive slides of the same type
- ZERO REPETITION — each slide must cover a genuinely different topic. Never have 2 slides about the same concept (e.g. don't have both "The Data Problem" and "Data Fragmentation Crisis" — these are the same topic).

SLIDE TITLE RULES:
- Every title (except TITLE and CTA) MUST be a complete sentence with a subject, verb, and object
- BAD: "Market Opportunity" — topic label, not a title
- BAD: "Key Challenges" — generic, says nothing specific
- GOOD: "Enterprise AI spending will reach $55B by 2027"
- GOOD: "Manual data prep consumes 68% of analyst time"
- The title IS the slide's takeaway. If someone reads only titles, they should understand the full story.

DAVID PHILLIPS PRESENTATION PRINCIPLES (mandatory):
- ONE MESSAGE per slide. Never combine two distinct ideas on one slide.
- MAX 6 OBJECTS per slide (each text block, image, table, icon counts as 1). More slides with less content beats fewer slides with more.
- NO FULL SENTENCES on slides — use short phrases (max 8 words per bullet). Detail goes in speaker notes.
- OPEN WITH A HOOK — slide 2 should be a surprising fact, customer story, or provocation (not an agenda).
- DATA WRAPPED IN NARRATIVE — embed statistics inside a story arc. Facts in stories = 22x better retention.
- Each bullet must be a SPECIFIC claim with a number, not a topic label.
- SIZE = IMPORTANCE — the key figure or takeaway must be the largest element, not the slide title.

AVAILABLE SLIDE TYPES (choose the type that best matches the content — see rendering details):
TITLE — Opening slide: tagline subtitle, author info. Use for the opening hook.
DATA_METRICS — Tables and metrics dominate. Use when the content is primarily numbers, KPIs, market data, or comparisons across categories. Renderer auto-highlights $X, X%, Xx in accent color. Tables render with styled headers.
CONTENT — The workhorse slide. Lead paragraph + table + ### takeaway + sources. Use for structured analysis where data is presented in tabular form with narrative context.
PROBLEM — Pain points with specific cost/impact metrics (red accent bar). Include $ cost or % impact.
SOLUTION — Capabilities mapped directly to problems (green accent bar). Include measurable outcomes.
COMPARISON — Before/after or option A vs B. Rendered as two-column layout. Great for side-by-side tables or bullet groups.
PROCESS — Step-by-step workflows. Numbered steps render in accent color. Use for implementation paths, timelines.
ARCHITECTURE — System diagrams. Image carries the visual weight; keep text minimal. Use for tech stacks, platform layers.
QUOTE — Notable quote from a named person. Rendered with gold accent border and decorative italic.
CTA — Call to action with 2-3 concrete next steps. Closing slide before thank-you.
OUTLINE — Table of contents / agenda slide. Title is "Agenda" or "What We'll Cover". Body lists numbered items matching the remaining slide titles. Placed as slide 2 (after TITLE). Only include when explicitly requested.
VISUAL_HUMOR — Image-forward dry humor slide. Title is the punchline (max 8 words, dry wit, not slapstick). Body is empty. The humor emerges from pairing a deadpan business title with an unexpected but realistic AI image — think New Yorker cartoon, not meme. Use for transition moments, visual metaphors with humor, or breather slides between dense content. Max 1-2 per deck. Works best with CONVERSATIONAL, BOLD, INSPIRATIONAL, or STORYTELLING tones. Skip entirely for FORMAL or ANALYTICAL presentations.
TEAM — CSS Grid person cards showing founders, leadership, or key team members. Each person gets a card with name, role, and credential. Max 6 people, 3 columns. Never generates images. Use when presenting team, leadership, or advisory board.
TIMELINE — Numbered milestone list with accent bar. Shows roadmap phases, evolution, or historical progression. Max 5 milestones. Use for roadmaps, phased plans, company evolution (NOT for how-to steps — that's PROCESS).
SECTION_DIVIDER — Full-bleed accent-colored section break with centered 1-3 word title. Body is always empty. Use to break decks of 12+ slides into major sections. Place before each topic shift. No pagination, no image, no notes.
METRICS_HIGHLIGHT — 2-4 oversized stat numbers in a horizontal CSS Grid layout. Use for impressive standalone KPIs, traction metrics, or financial headlines (NOT for detailed tables — that's DATA_METRICS).
FEATURE_GRID — 2x2 CSS Grid card layout showing 3-4 parallel capabilities, use cases, or product features. Each card has a bold title + one sentence description. Use when features/capabilities deserve equal visual weight.
PRODUCT_SHOWCASE — Split layout: left has bold headline + 1-sentence description, right has a large product screenshot/mockup (AI-generated via imagePromptHint). Use when showing what the product looks like in action — app screens, dashboards, user flows. Title should be a benefit statement, not "Product Demo". Body is minimal text; the image carries the weight.
LOGO_WALL — Grid of customer/partner/investor name badges. Title frames the social proof ("Trusted by 50+ enterprises" or "Backed by leading VCs"). Body contains styled text badges in a grid — no images needed. Use for credibility slides showing partnerships, customers, or investor backing. Max 12 logos.
MARKET_SIZING — TAM/SAM/SOM concentric market visualization. Title states the market size claim. Body contains structured data that renders as nested circles or a revenue derivation chain. Use for market opportunity slides in investor decks. Must include specific dollar amounts and sources.
SPLIT_STATEMENT — Bold provocative statement on left (30%), supporting evidence on right (70%). Left side is the emotional hook — one sentence, large font. Right side has 2-4 proof points with data. Think editorial magazine layout. Use for slides where a bold claim needs immediate backing.

SLIDE TYPE SELECTION RULES:
- Use DATA_METRICS or CONTENT (with tables) when the outline item contains 3+ data points that can be organized in columns
- Use COMPARISON when contrasting two options, time periods, or approaches
- Use PROCESS only for sequential workflows (3-6 steps)
- Use QUOTE when featuring a specific person's statement
- Prefer DATA_METRICS/CONTENT over PROBLEM/SOLUTION for data-heavy slides
- A well-structured deck typically has: 1 TITLE, 2-4 DATA_METRICS/CONTENT with tables, 1-2 PROBLEM/SOLUTION, 0-1 COMPARISON, 0-1 QUOTE, 0-2 VISUAL_HUMOR, 0-1 TEAM, 0-1 TIMELINE, 0-2 SECTION_DIVIDER, 0-1 METRICS_HIGHLIGHT, 0-1 FEATURE_GRID, 0-1 PRODUCT_SHOWCASE, 0-1 LOGO_WALL, 0-1 MARKET_SIZING, 0-1 SPLIT_STATEMENT, 1 CTA
- Use TEAM when presenting founders, leadership, or advisory board members
- Use TIMELINE for roadmap or milestones (NOT for how-to steps — that's PROCESS)
- Use SECTION_DIVIDER to break decks of 12+ slides into sections. Place before each major topic shift
- Use METRICS_HIGHLIGHT for 2-4 impressive standalone numbers/KPIs (NOT for detailed tables — that's DATA_METRICS)
- Use FEATURE_GRID for 3-4 parallel capabilities or product features shown with equal visual weight
- Use PRODUCT_SHOWCASE when showing product UI, app screenshots, or demo flows. Place early (slides 2-5) for consumer/product-led decks. imagePromptHint is MANDATORY for this type.
- Use LOGO_WALL for social proof: customer logos, investor names, partner brands. Place in the proof/credibility section. Max 12 logos.
- Use MARKET_SIZING for TAM/SAM/SOM market opportunity slides. Must include specific dollar amounts. Renders as concentric circles visualization. One per deck max.
- Use SPLIT_STATEMENT for bold provocative claims that need immediate evidence. Left = emotional hook (large text), right = supporting data. Great for problem slides, insight reveals, or thesis statements. Use instead of PROBLEM when the pain is more emotional than analytical.
- NARRATIVE RHYTHM: Alternate between emotional slides (SPLIT_STATEMENT, QUOTE, PRODUCT_SHOWCASE) and analytical slides (DATA_METRICS, COMPARISON, MARKET_SIZING) to maintain audience engagement. Never place 3+ analytical slides in a row.
- Use VISUAL_HUMOR sparingly (max 1-2 per deck) as a breather between dense slides — only when tone is conversational, bold, inspirational, or storytelling. Never use for formal or analytical presentations.
- AI DEFENSIBILITY: When the topic involves AI, ML, or technology, include a FEATURE_GRID slide addressing AI resilience with 3 pillars: (1) Deep Workflow Integration — how the product embeds into complex processes vs. surface-level chatbot features, (2) Proprietary Data Loops — unique datasets or feedback loops competitors cannot replicate, (3) Trust Layer — human-in-the-loop verification, regulatory compliance, or brand trust moats. Title should be a defensibility claim like "Three moats competitors cannot replicate" — NOT "AI Defensibility". Place after SOLUTION slides and before COMPARISON.

NARRATIVE ARC (CRITICAL):
- The presentation MUST tell a coherent story from start to finish.
- Reading ONLY the slide titles should convey a complete, persuasive narrative.
- Middle slides must advance toward a resolution — never drift into unrelated tangents.
- If the topic implies an "engagement plan", "go-to-market", "adoption strategy", or "implementation path", there MUST be at least one dedicated slide for it. Do NOT leave the audience wondering "but how does this actually work for me?"
- Every slide after the opening must answer a logical question raised by the previous slide.

${pitchLensContext ? pitchLensContext : `PRESENTATION TYPE GUIDANCE:\n${getTypeGuidance(presentationType)}`}

${archetypeContext ? archetypeContext : ''}

${kbContext ? `KNOWLEDGE BASE CONTEXT (ground your outline in this verified content — pull specific facts, data points, and claims):
${kbContext}` : ''}

SECTION LABELS (add a short uppercase label for each slide's narrative section):
- Each slide gets a sectionLabel: a 1-3 word ALL-CAPS tag shown in the top-left corner (e.g., "VISION", "EVIDENCE", "THE ASK", "TEAM", "COMPETITIVE LANDSCAPE", "PROBLEM", "SOLUTION", "ARCHITECTURE", "PATH", "BUSINESS MODEL")
- Section labels group slides into narrative chapters and help the audience track where they are in the story
- Adjacent slides CAN share the same sectionLabel if they belong to the same narrative section
- Use specific, descriptive labels — not generic ones like "SLIDE 3" or "CONTENT"

OUTPUT FORMAT:
Respond with valid JSON matching this schema:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "slideType": "TITLE",
      "sectionLabel": "INTRODUCTION",
      "sources": ["Document Title A"]
    }
  ]
}

SOURCES ATTRIBUTION:
- Each slide's "sources" field is an array of document titles from the knowledge base that informed that slide's content.
- If a slide uses facts, data, or claims from a KB document, include that document's title in the sources array.
- If a slide does not use any KB content (e.g., TITLE, CTA), set sources to an empty array [].
- Use the exact document titles shown in the "(source: ...)" annotations in the knowledge base context above.

Only output JSON. No markdown fences, no explanation.`;
}

export function buildOutlineUserPrompt(
  topic: string,
  frameworkSlideStructure?: string[],
): string {
  let frameworkConstraint = '';

  if (frameworkSlideStructure && frameworkSlideStructure.length > 0) {
    const structureList = frameworkSlideStructure
      .map((step, i) => `  ${i + 1}. ${step}`)
      .join('\n');

    frameworkConstraint = `

MANDATORY SLIDE STRUCTURE (follow this section order exactly — do not skip any section):
${structureList}

CRITICAL RULES:
- Each section above MUST have at least 1 dedicated slide. Do not merge sections.
- You MAY expand sections into multiple slides AND insert SECTION_DIVIDER, METRICS_HIGHLIGHT, FEATURE_GRID, TEAM, or TIMELINE slides between sections when the archetype requires them. These extra slides supplement the framework — they do not replace framework sections.
- The slide titles must clearly signal which section they belong to.
- If the framework has an "Engagement", "Plan", "Go-to-Market", "Bridge", or "How It Works" section, that slide MUST explicitly address the audience's adoption/engagement path — how will they actually use, buy, or implement this?
- The narrative must flow as a coherent story: each slide's title should logically lead to the next.
- Reading ONLY the slide titles should tell a complete, persuasive story from beginning to end.
- SECTION_DIVIDER slides have bulletPoints: [] (empty array). All other slide types need 1+ bulletPoints.`;
  }

  return `Create a presentation outline about: ${topic}${frameworkConstraint}`;
}

function getTypeGuidance(presentationType: string): string {
  switch (presentationType) {
    case 'VC_PITCH':
      return `VC/Investor Pitch structure (inspired by top fundraise decks):
1. TITLE — Company name + bold tagline. Set the tone immediately.
2. PROBLEM — Why the status quo is broken. Use "Current X is bounded" framing with specific limitations (3-5 concrete failure modes).
3. PROBLEM — What the world NEEDS but doesn't have yet. Frame as "The foundations of [real X]" — list 5-7 capabilities missing from current solutions.
4. SOLUTION — Your vision: "The future will be powered by [your approach]". Define your core technology/method clearly.
5. CONTENT — Evidence it works: show research results, demos, benchmarks, proof points. Use specific names and numbers.
6. ARCHITECTURE — Technical roadmap: show the integrated system. Diagram + 3-4 component pillars.
7. PROCESS — Execution roadmap: 3 phased milestones (Research → Partnerships → Productization).
8. CONTENT — Use cases: 4 quadrant layout of target applications with 1-line descriptions each.
9. CONTENT — Business model: revenue engines (licensing, partnerships, APIs).
10. CONTENT — Team: "The world's best minds in [X]" — key leaders with titles and affiliations. Note total headcount.
11. CONTENT — Global presence / competitive advantage (what sets you apart from others in the space).
12. COMPARISON — Competitive landscape: categorize competitors by APPROACH, not features. Show 2-3 category buckets and position yourself in the best one.
13. DATA_METRICS — The Ask: funding amount + 3 milestone-based use-of-funds breakdown.
14. CTA — Closing: bold mission statement + call to action.

INVESTOR DECK PRINCIPLES:
- Build a narrative arc: Status Quo Is Broken → Vision of Better Future → We Have the Key → Here's the Proof → Here's the Plan → Join Us
- Each slide should make the audience WANT to see the next one
- Problem slides use urgency and specificity. Solution slides use ambition and clarity.
- Evidence before ask. Never ask for money before proving you deserve it.
- The competitive landscape slide positions by CATEGORY (how competitors think about the space), not by feature checklist.
- For AI/tech companies: include a FEATURE_GRID slide showing AI defensibility — deep workflow integration, proprietary data loops, and trust layer. Investors in 2026 expect founders to proactively address "why won't a foundation model just replace you?" Place between solution proof and competitive landscape.

PRE-SEED ALTERNATIVE (use when the archetype is PRE_SEED_PITCH or when the company has no revenue):
1. TITLE — Bold one-line pitch. No subtitle clutter.
2. SPLIT_STATEMENT — The problem as an emotional statement + supporting evidence points.
3. PRODUCT_SHOWCASE — Show the product early. Screenshot, mockup, or demo flow.
4. SOLUTION — Your approach as a paradigm shift, not a feature list.
5. FEATURE_GRID — 3-4 key capabilities with equal visual weight.
6. MARKET_SIZING — TAM/SAM/SOM concentric visualization with dollar amounts.
7. CONTENT — Business model or go-to-market strategy.
8. DATA_METRICS or METRICS_HIGHLIGHT — Traction (even if early: waitlist, pilots, LOIs).
9. TEAM — Founders with domain credentials and founder-market fit story.
10. LOGO_WALL — Partners, advisors, or early customers (if available).
11. COMPARISON — Competitive positioning by approach, not features.
12. DATA_METRICS — The Ask: specific amount + milestones.
13. CTA — Bold closing statement + contact info.
Pre-seed decks can use 10-16 slides. Prioritize narrative over data density.
For AI/tech startups: add a FEATURE_GRID slide after SOLUTION showing 3 defensibility pillars (workflow integration, proprietary data, trust layer). Investors expect this in 2026 — proactively addressing "why can't GPT-5 do this?" is a signal of strategic maturity.`;

    case 'TECHNICAL':
      return `Technical presentation structure:
1. Title slide
2. Context / motivation
3. Architecture overview
4. Deep-dive sections (2-4 slides)
5. Implementation details
6. Performance / benchmarks
7. Demo
8. Q&A`;

    case 'EXECUTIVE':
      return `Executive briefing structure:
1. Title slide
2. Executive summary (key takeaways upfront)
3. Key findings (2-3 slides with data)
4. Recommendations (actionable)
5. Next steps + timeline`;

    case 'STANDARD':
    default:
      return `Standard presentation structure:
1. Title slide
2. Agenda / overview
3. Content sections (4-8 slides)
4. Key takeaways
5. Call to action / next steps`;
  }
}
