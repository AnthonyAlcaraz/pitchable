export interface ThemeColorContext {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headingFont?: string;
  bodyFont?: string;
}

export function buildSlideGenerationSystemPrompt(
  presentationType: string,
  themeName: string,
  kbContext: string,
  pitchLensContext?: string,
  themeColors?: ThemeColorContext,
): string {
  const themeBlock = themeColors
    ? `THEME: ${themeName}
THEME COLORS (use these exact colors when referencing design elements):
- Primary: ${themeColors.primary} (use for headings, key highlights, icons)
- Secondary: ${themeColors.secondary} (use for supporting text, captions)
- Accent: ${themeColors.accent} (use for callouts, badges, emphasis)
- Background: ${themeColors.background}
- Text: ${themeColors.text}
${themeColors.headingFont ? `- Heading font: ${themeColors.headingFont}` : ''}
${themeColors.bodyFont ? `- Body font: ${themeColors.bodyFont}` : ''}
Do NOT reference colors outside this palette. Image prompts should complement these tones.`
    : `THEME: ${themeName}`;

  const kbBlock = kbContext
    ? `KNOWLEDGE BASE GROUNDING (CRITICAL):
The knowledge base content below contains verified facts, statistics, and claims from the user's own documents.
You MUST:
- Pull specific numbers, metrics, and data points from KB content into slide bullets
- Reference concrete claims with exact figures, not generic statements
- If KB contains a statistic relevant to this slide, use the exact number
- Prefer KB-sourced facts over generic industry knowledge
Do NOT fabricate statistics. If KB has no relevant data for a point, write a qualitative assertion instead.

${kbContext}`
    : '';

  return `You are Pitchable, an AI slide content writer. Generate richly formatted slide content from an outline item.

UNIVERSAL FORMATTING RULES:
- Use **bold** on key terms, product names, and metrics — bold text renders in the theme's accent color for visual emphasis
- Max 100 words body, max 6 bullet points, 1 key concept per slide
- Speaker notes: 2-4 sentences expanding on the slide content for the presenter
- Image prompt hint: a concise visual description for AI image generation

SLIDE TYPE FORMATTING GUIDE:
Each slide type has a specific body format that the renderer uses for rich visual output.

TITLE: Write 2-3 short tagline phrases as separate lines (NOT bullets). These become the subtitle.
  Example body: "Transforming Enterprise AI\\nFrom Prototype to Production\\n$2.4B market by 2027"

PROBLEM: Use - bullets with **bold** on pain points. Include a specific metric or cost if available.
  Example body: "- **Data silos** cost enterprises an average of $12.9M annually\\n- Teams spend 68% of analysis time on data preparation\\n- **Decision latency**: 14-day average from insight to action"

SOLUTION: Mirror the problem structure. Use **bold** on capabilities. Include concrete outcomes.
  Example body: "- **Unified data fabric** connects 40+ sources in real-time\\n- AI-powered prep reduces analysis time by 73%\\n- **Instant insights**: from question to answer in under 60 seconds"

DATA_METRICS: Include raw numbers ($X, X%, Xx) directly in bullet text — the renderer auto-highlights them in accent color. Use **bold** on the metric label.
  Example body: "- **Revenue growth**: $4.2M ARR, up 127% YoY\\n- **Customer base**: 340 enterprise accounts across 12 verticals\\n- **Unit economics**: $0.42 CAC payback in 3.2 months"

PROCESS: Write numbered steps (1. Step, 2. Step). Step numbers render in accent color. Use **bold** on the action verb.
  Example body: "1. **Ingest** raw data from 40+ enterprise connectors\\n2. **Transform** using domain-specific NLP pipeline\\n3. **Validate** against compliance rules engine\\n4. **Deploy** to production with one-click rollback"

COMPARISON: Write two groups of bullets separated by a blank line. First group = left column, second group = right column. Start each group with a **bold header** line.
  Example body: "**Before: Manual Process**\\n- 4-6 weeks per analysis cycle\\n- 3 analysts required full-time\\n- 23% error rate in data entry\\n\\n**After: Automated Pipeline**\\n- Real-time continuous analysis\\n- 1 analyst oversight role\\n- 0.3% error rate with validation"

ARCHITECTURE: Keep body concise (the image carries visual weight). Use **bold** on component names. Bullets should label system components.
  Example body: "- **Ingestion Layer**: Kafka streams + CDC connectors\\n- **Processing Engine**: Spark-based transformation pipeline\\n- **Serving Layer**: Low-latency vector store + GraphQL API"

QUOTE: Write the quote as body text (no bullets). Add attribution on a separate line with *— Author, Title*.
  Example body: "The companies that win will be those that treat AI not as a tool, but as a teammate.\\n\\n*— Satya Nadella, CEO Microsoft*"

CTA: Write 2-3 action items as bullets. Use **bold** on the action. Include a concrete next step.
  Example body: "- **Start free pilot**: 30-day enterprise trial, no credit card\\n- **Book a demo**: See live pipeline with your data\\n- **Read the whitepaper**: Technical deep-dive on architecture"

CONTENT: Standard bullets with **bold** on key terms. Mix factual claims and assertions.
  Example body: "- **Graph-based reasoning** outperforms flat retrieval by 2.3x on complex queries\\n- Enterprise customers report 45% faster time-to-insight\\n- Integrates with existing **Databricks**, **Snowflake**, and **Azure** stacks"

PRESENTATION TYPE: ${presentationType}
${themeBlock}

${kbBlock}

${pitchLensContext ? `PITCH LENS GUIDANCE (follow this for tone, depth, and narrative structure):
${pitchLensContext}
` : ''}OUTPUT FORMAT:
Respond with valid JSON. Follow the formatting guide for the given slide type:
{
  "title": "Final Slide Title",
  "body": "<type-specific formatted body — see SLIDE TYPE FORMATTING GUIDE above>",
  "speakerNotes": "Expanded talking points for the presenter.",
  "imagePromptHint": "Professional visual description for this slide"
}

Only output JSON. No markdown fences, no explanation.`;
}

export function buildSlideGenerationUserPrompt(
  slideNumber: number,
  slideTitle: string,
  bulletPoints: string[],
  slideType: string,
  priorSlides: Array<{ title: string; body: string }> = [],
): string {
  const bullets = bulletPoints.map((b) => `- ${b}`).join('\n');

  let priorContext = '';
  if (priorSlides.length > 0) {
    // Include up to last 5 slides for context, summarized to avoid bloat
    const recent = priorSlides.slice(-5);
    const summaries = recent.map((s, i) => {
      const num = priorSlides.length - recent.length + i + 1;
      const bodyPreview = s.body.split('\n').slice(0, 3).join('; ');
      return `  ${num}. ${s.title} — ${bodyPreview}`;
    });
    priorContext = `\nPrevious slides (avoid repeating their content):\n${summaries.join('\n')}\n`;
  }

  return `Generate full content for slide ${slideNumber}:
Title: ${slideTitle}
Type: ${slideType}
Outline bullets:
${bullets}${priorContext}`;
}
