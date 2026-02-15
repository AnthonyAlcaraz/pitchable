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

CONSTRAINTS:
- Between ${slideRange.min} and ${slideRange.max} slides total
- Each slide must have 3-6 bullet points maximum
- Each bullet point must be under 15 words
- Slide 1 must be type TITLE
- Last slide must be type CTA
- 1 key concept per slide

AVAILABLE SLIDE TYPES:
TITLE, PROBLEM, SOLUTION, ARCHITECTURE, PROCESS, COMPARISON, DATA_METRICS, CTA, CONTENT, QUOTE

${pitchLensContext ? pitchLensContext : `PRESENTATION TYPE GUIDANCE:\n${getTypeGuidance(presentationType)}`}

${kbContext ? `KNOWLEDGE BASE CONTEXT (use this to enrich the outline):\n${kbContext}` : ''}

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
