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
- Between ${slideRange.min} and ${slideRange.max} slides total
- Each slide must have 3-6 bullet points maximum
- Each bullet should be a specific claim, data point, or source-backed assertion — NOT a generic topic label
- Include exact numbers, percentages, currency values, and named sources in bullets whenever available
- If the knowledge base provides a relevant statistic, include the exact number in the bullet
- Slide 1 must be type TITLE
- Last slide must be type CTA
- 1 key concept per slide
- Vary slide types for visual interest — avoid consecutive slides of the same type

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

SLIDE TYPE SELECTION RULES:
- Use DATA_METRICS or CONTENT (with tables) when the outline item contains 3+ data points that can be organized in columns
- Use COMPARISON when contrasting two options, time periods, or approaches
- Use PROCESS only for sequential workflows (3-6 steps)
- Use QUOTE when featuring a specific person's statement
- Prefer DATA_METRICS/CONTENT over PROBLEM/SOLUTION for data-heavy slides
- A well-structured deck typically has: 1 TITLE, 2-4 DATA_METRICS/CONTENT with tables, 1-2 PROBLEM/SOLUTION, 0-1 COMPARISON, 0-1 QUOTE, 1 CTA

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

export function buildOutlineUserPrompt(topic: string): string {
  return `Create a presentation outline about: ${topic}`;
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
