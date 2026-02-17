import type { SlideType } from '../../../generated/prisma/enums.js';

export interface OutlineSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  slideType: SlideType;
}

export interface GeneratedOutline {
  title: string;
  slides: OutlineSlide[];
}

export function buildOutlineSystemPrompt(
  presentationType: string,
  slideRange: { min: number; max: number },
  kbContext: string,
  pitchLensContext?: string,
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
VISUAL_HUMOR — Image-forward humor slide. Title is a short witty phrase (max 8 words). Body is empty or a single punchline subtitle (max 10 words). The AI-generated image carries the entire message — humor comes from the interplay between the title and a vivid photorealistic scene. Use for transition moments, visual metaphors with humor, or breather slides between dense content. Max 1-2 per deck. Works best with CONVERSATIONAL, BOLD, INSPIRATIONAL, or STORYTELLING tones. Skip entirely for FORMAL or ANALYTICAL presentations.

SLIDE TYPE SELECTION RULES:
- Use DATA_METRICS or CONTENT (with tables) when the outline item contains 3+ data points that can be organized in columns
- Use COMPARISON when contrasting two options, time periods, or approaches
- Use PROCESS only for sequential workflows (3-6 steps)
- Use QUOTE when featuring a specific person's statement
- Prefer DATA_METRICS/CONTENT over PROBLEM/SOLUTION for data-heavy slides
- A well-structured deck typically has: 1 TITLE, 2-4 DATA_METRICS/CONTENT with tables, 1-2 PROBLEM/SOLUTION, 0-1 COMPARISON, 0-1 QUOTE, 0-2 VISUAL_HUMOR, 1 CTA
- Use VISUAL_HUMOR sparingly (max 1-2 per deck) as a breather between dense slides — only when tone is conversational, bold, inspirational, or storytelling. Never use for formal or analytical presentations.

NARRATIVE ARC (CRITICAL):
- The presentation MUST tell a coherent story from start to finish.
- Reading ONLY the slide titles should convey a complete, persuasive narrative.
- Middle slides must advance toward a resolution — never drift into unrelated tangents.
- If the topic implies an "engagement plan", "go-to-market", "adoption strategy", or "implementation path", there MUST be at least one dedicated slide for it. Do NOT leave the audience wondering "but how does this actually work for me?"
- Every slide after the opening must answer a logical question raised by the previous slide.

${pitchLensContext ? pitchLensContext : `PRESENTATION TYPE GUIDANCE:\n${getTypeGuidance(presentationType)}`}

${kbContext ? `KNOWLEDGE BASE CONTEXT (ground your outline in this verified content — pull specific facts, data points, and claims):
${kbContext}` : ''}

OUTPUT FORMAT:
Respond with valid JSON matching this schema:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "slideType": "TITLE"
    }
  ]
}

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
- The slide titles must clearly signal which section they belong to.
- If the framework has an "Engagement", "Plan", "Go-to-Market", "Bridge", or "How It Works" section, that slide MUST explicitly address the audience's adoption/engagement path — how will they actually use, buy, or implement this?
- The narrative must flow as a coherent story: each slide's title should logically lead to the next.
- Reading ONLY the slide titles should tell a complete, persuasive story from beginning to end.`;
  }

  return `Create a presentation outline about: ${topic}${frameworkConstraint}`;
}

function getTypeGuidance(presentationType: string): string {
  switch (presentationType) {
    case 'VC_PITCH':
      return `VC Pitch structure:
1. Title slide (hook + company name)
2. Problem (pain point with market evidence)
3. Solution (your unique approach)
4. Market size (TAM/SAM/SOM)
5. Product/demo (how it works)
6. Traction (metrics, users, revenue)
7. Business model (how you make money)
8. Competition (positioning matrix)
9. Team (founders + key hires)
10. The Ask (funding amount + use of funds)`;

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
