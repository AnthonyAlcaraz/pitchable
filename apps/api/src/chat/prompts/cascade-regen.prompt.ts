import type { ThemeColorContext } from './slide-generation.prompt.js';

interface PrecedingSlide {
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
}

export function buildCascadeRegenPrompt(
  precedingSlides: PrecedingSlide[],
  currentSlide: { title: string; body: string; speakerNotes: string | null; slideType: string },
  originalFeedback: string,
  primarySlideNumber: number,
  kbContext: string,
  themeColors?: ThemeColorContext,
  pitchLensContext?: string,
): string {
  const themeBlock = themeColors
    ? `THEME COLORS (preserve these in any formatting decisions):
- Primary: ${themeColors.primary} (headings, key highlights)
- Secondary: ${themeColors.secondary} (supporting text)
- Accent: ${themeColors.accent} (callouts, emphasis, **bold** renders in this color)
- Background: ${themeColors.background}
- Text: ${themeColors.text}
${themeColors.headingFont ? `- Heading font: ${themeColors.headingFont}` : ''}
${themeColors.bodyFont ? `- Body font: ${themeColors.bodyFont}` : ''}`
    : '';

  const kbBlock = kbContext
    ? `KNOWLEDGE BASE GROUNDING (CRITICAL):
The knowledge base content below contains verified facts, statistics, and claims.
When adapting content, prefer KB-sourced facts over generic statements.
Do NOT fabricate statistics.

${kbContext}`
    : '';

  const precedingContext = precedingSlides
    .map((s) => `--- Slide ${s.slideNumber} [${s.slideType}] ---
Title: ${s.title}
Body: ${s.body}`)
    .join('\n\n');

  return `You are Pitchable, an AI slide content editor performing a CASCADE REGENERATION.

CONTEXT: The user made a structural change to slide ${primarySlideNumber}. Their instruction was:
"${originalFeedback}"

All preceding slides (including the modified one) have already been updated. Your job is to adapt THIS slide so it maintains narrative coherence with the updated deck flow.

PRECEDING SLIDES (already updated):
${precedingContext}

CURRENT SLIDE TO ADAPT:
Title: ${currentSlide.title}
Body: ${currentSlide.body}
Speaker Notes: ${currentSlide.speakerNotes ?? 'None'}
Type: ${currentSlide.slideType}

RULES:
- Preserve the slide's TYPE (${currentSlide.slideType}) and general purpose
- Adapt content so it flows naturally from the preceding slides
- If the preceding narrative shifted topic, adjust references and transitions accordingly
- Keep the same formatting pattern for the slide type
- Use **bold** on key terms, product names, and metrics
- Max 100 words body, max 6 bullet points, 1 key concept per slide
- Speaker notes: 2-4 sentences expanding on the slide content

SLIDE TYPE FORMATTING GUIDE for "${currentSlide.slideType}":
TITLE: 2-3 short tagline phrases as separate lines (NOT bullets)
PROBLEM: Use - bullets with **bold** on pain points. Include metrics.
SOLUTION: Use **bold** on capabilities. Include concrete outcomes.
DATA_METRICS: Raw numbers in bullet text. **Bold** on metric labels.
PROCESS: Numbered steps (1. Step). **Bold** on action verbs.
COMPARISON: Two groups of bullets separated by blank line. **Bold headers**.
ARCHITECTURE: Concise bullets with **bold** component names.
QUOTE: Quote text + *— Author, Title*.
CTA: Action items with **bold** on the action.
CONTENT: Standard bullets with **bold** on key terms.

${themeBlock}

${kbBlock}

${pitchLensContext ? `PITCH LENS GUIDANCE (maintain this tone and narrative style):
${pitchLensContext}
` : ''}OUTPUT FORMAT:
{
  "title": "Adapted Title",
  "body": "<type-specific formatted body>",
  "speakerNotes": "Adapted speaker notes."
}

Only output JSON. No markdown fences, no explanation.`;
}
