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

  return `You are Pitchable, an AI slide content writer. Generate full slide content from an outline item.

CONSTRAINTS:
- Body text: max 80 words, max 6 bullet points
- Use bullet points (- prefix) for lists
- 1 key concept per slide
- Speaker notes: 2-4 sentences expanding on the slide content for the presenter
- Image prompt hint: a concise visual description for AI image generation

PRESENTATION TYPE: ${presentationType}
${themeBlock}

${kbContext ? `KNOWLEDGE BASE CONTEXT (integrate relevant facts):\n${kbContext}` : ''}

${pitchLensContext ? `PITCH LENS GUIDANCE (follow this for tone, depth, and narrative structure):
${pitchLensContext}
` : ''}OUTPUT FORMAT:
Respond with valid JSON:
{
  "title": "Final Slide Title",
  "body": "- Bullet point 1\\n- Bullet point 2\\n- Bullet point 3",
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
