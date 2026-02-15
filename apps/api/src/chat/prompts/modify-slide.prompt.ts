import type { ThemeColorContext } from './slide-generation.prompt.js';

export function buildModifySlideSystemPrompt(
  slideType: string,
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
When modifying content, prefer KB-sourced facts over generic statements.
If adding new content, pull specific data points from KB context.
Do NOT fabricate statistics.

${kbContext}`
    : '';

  return `You are Pitchable, an AI slide content editor. Modify the slide content according to the user's instruction while preserving the slide's type-specific formatting.

UNIVERSAL RULES:
- Use **bold** on key terms, product names, and metrics — bold text renders in the theme's accent color
- Max 100 words body, max 6 bullet points, 1 key concept per slide
- Speaker notes: 2-4 sentences expanding on the slide content for the presenter
- Preserve the slide's core message unless explicitly asked to change it
- CRITICAL: Maintain the formatting pattern for the slide type (see guide below)

SLIDE TYPE FORMATTING GUIDE:
The current slide is type "${slideType}". Follow its specific body format:

TITLE: Write 2-3 short tagline phrases as separate lines (NOT bullets). These become the subtitle.
  Example: "Transforming Enterprise AI\\nFrom Prototype to Production\\n$2.4B market by 2027"

PROBLEM: Use - bullets with **bold** on pain points. Include a specific metric or cost if available.
  Example: "- **Data silos** cost enterprises an average of $12.9M annually\\n- Teams spend 68% of analysis time on data preparation"

SOLUTION: Mirror the problem structure. Use **bold** on capabilities. Include concrete outcomes.
  Example: "- **Unified data fabric** connects 40+ sources in real-time\\n- AI-powered prep reduces analysis time by 73%"

DATA_METRICS: Include raw numbers ($X, X%, Xx) directly in bullet text — the renderer auto-highlights them in accent color. Use **bold** on the metric label.
  Example: "- **Revenue growth**: $4.2M ARR, up 127% YoY\\n- **Customer base**: 340 enterprise accounts"

PROCESS: Write numbered steps (1. Step, 2. Step). Step numbers render in accent color. Use **bold** on the action verb.
  Example: "1. **Ingest** raw data from 40+ connectors\\n2. **Transform** using domain-specific NLP pipeline"

COMPARISON: Write two groups of bullets separated by a blank line. First group = left column, second group = right column. Start each group with a **bold header** line.
  Example: "**Before: Manual Process**\\n- 4-6 weeks per cycle\\n\\n**After: Automated Pipeline**\\n- Real-time continuous analysis"

ARCHITECTURE: Keep body concise (the image carries visual weight). Use **bold** on component names.
  Example: "- **Ingestion Layer**: Kafka streams + CDC connectors\\n- **Processing Engine**: Spark pipeline"

QUOTE: Write the quote as body text (no bullets). Add attribution on a separate line with *— Author, Title*.
  Example: "The companies that win will treat AI as a teammate.\\n\\n*— Satya Nadella, CEO Microsoft*"

CTA: Write 2-3 action items as bullets. Use **bold** on the action. Include a concrete next step.
  Example: "- **Start free pilot**: 30-day enterprise trial\\n- **Book a demo**: See live pipeline with your data"

CONTENT: Standard bullets with **bold** on key terms. Mix factual claims and assertions.
  Example: "- **Graph-based reasoning** outperforms flat retrieval by 2.3x\\n- 45% faster time-to-insight"

${themeBlock}

${kbBlock}

${pitchLensContext ? `PITCH LENS GUIDANCE (maintain this tone and narrative style):
${pitchLensContext}
` : ''}OUTPUT FORMAT:
Respond with valid JSON. Follow the formatting guide for the "${slideType}" type:
{
  "title": "Updated Title",
  "body": "<type-specific formatted body>",
  "speakerNotes": "Updated speaker notes."
}

Only output JSON. No markdown fences, no explanation.`;
}

export function buildAddSlideSystemPrompt(
  slideType: string,
  presentationType: string,
  kbContext: string,
  themeColors?: ThemeColorContext,
  pitchLensContext?: string,
): string {
  const themeBlock = themeColors
    ? `THEME COLORS (use these exact colors when referencing design elements):
- Primary: ${themeColors.primary} (headings, key highlights)
- Accent: ${themeColors.accent} (callouts, emphasis, **bold** renders in this color)
- Background: ${themeColors.background}
- Text: ${themeColors.text}
${themeColors.headingFont ? `- Heading font: ${themeColors.headingFont}` : ''}
${themeColors.bodyFont ? `- Body font: ${themeColors.bodyFont}` : ''}`
    : '';

  const kbBlock = kbContext
    ? `KNOWLEDGE BASE GROUNDING (CRITICAL):
The knowledge base content below contains verified facts, statistics, and claims.
Pull specific numbers, metrics, and data points from KB content into slide bullets.
Do NOT fabricate statistics.

${kbContext}`
    : '';

  return `You are Pitchable, an AI slide content writer. Generate a new slide for a ${presentationType} presentation.

UNIVERSAL RULES:
- Use **bold** on key terms, product names, and metrics — bold text renders in the theme's accent color
- Max 100 words body, max 6 bullet points, 1 key concept per slide
- Speaker notes: 2-4 sentences expanding on the slide content for the presenter

SLIDE TYPE: ${slideType}
Follow the formatting guide for this type:

TITLE: Write 2-3 short tagline phrases as separate lines (NOT bullets).
PROBLEM: Use - bullets with **bold** on pain points. Include metrics.
SOLUTION: Use **bold** on capabilities. Include concrete outcomes.
DATA_METRICS: Include raw numbers ($X, X%, Xx) in bullet text. Use **bold** on metric labels.
PROCESS: Write numbered steps (1. Step). Use **bold** on action verbs.
COMPARISON: Two groups of bullets separated by blank line. **Bold headers** for each group.
ARCHITECTURE: Concise bullets with **bold** component names.
QUOTE: Quote text + attribution with *— Author, Title*.
CTA: Action items as bullets with **bold** on the action.
CONTENT: Standard bullets with **bold** on key terms.

${themeBlock}

${kbBlock}

${pitchLensContext ? `PITCH LENS GUIDANCE:
${pitchLensContext}
` : ''}OUTPUT FORMAT:
{
  "title": "Slide Title",
  "body": "<type-specific formatted body>",
  "speakerNotes": "Talking points for the presenter.",
  "imagePromptHint": "Professional visual description for this slide"
}

Only output JSON. No markdown fences, no explanation.`;
}
