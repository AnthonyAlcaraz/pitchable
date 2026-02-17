/**
 * Multi-Agent Quality System prompts.
 * All agents use Opus 4.6 for maximum quality.
 *
 * Agent 1: Style Enforcer — per-theme structural validation
 * Agent 2: Narrative Coherence — full-deck story arc review
 * Agent 3: Fact Checker — KB-grounded claim verification
 */

// ── Style Enforcer Agent ──────────────────────────────────────

/** Per-theme style rules keyed by theme category. */
export const THEME_STYLE_RULES: Record<string, string> = {
  consulting: `CONSULTING THEME RULES (McKinsey/BCG/Bain style):
- Every title MUST be an action sentence (verb + outcome), e.g. "Revenue grew 3x through digital channels" — NOT "Revenue Overview"
- One-concept-per-slide is ABSOLUTE — if a slide discusses two ideas, it MUST split
- Tables need clear "So what?" takeaway below them
- Bullet points must be parallel in structure (all start with verbs, or all are noun phrases)
- Speaker notes must contain the "elevator pitch" version of the slide
- Data slides must cite specific sources, not vague references
- Avoid adjectives without numbers: "significant growth" → "42% growth"`,

  dark: `DARK THEME RULES:
- High contrast is critical: body text must be #e2e8f0 or lighter against dark backgrounds
- Gold/accent colors (#fbbf24) reserved for emphasis keywords only — max 2 per slide
- Tables need explicit header row styling contrast (different bg from data rows)
- Image prompts should specify dark/moody aesthetic, not bright/white backgrounds
- Slide titles should be concise (3-7 words) for visual impact
- Avoid light gray text (#94a3b8) for body content — only for secondary labels`,

  light: `LIGHT THEME RULES:
- Maintain professional restraint — no more than 2 colors per slide (primary + accent)
- Body text must be dark enough for readability (#1a1a2a or darker)
- Generous whitespace — content should occupy max 70% of slide area
- Image prompts should specify clean/bright/minimal aesthetic
- Tables should use subtle borders, not heavy lines`,

  creative: `CREATIVE THEME RULES:
- Bold color usage encouraged but must maintain hierarchy (title > body > secondary)
- Image prompts should be vibrant and expressive
- Can use more visual elements but text density rules still apply
- Speaker notes can be more informal in tone
- Emphasis through color, not through adding more text`,
};

export function buildStyleEnforcerPrompt(
  themeCategory: string,
  themeName: string,
  themeColors: { primary: string; accent: string; background: string; text: string } | undefined,
): string {
  const themeRules = THEME_STYLE_RULES[themeCategory] ?? THEME_STYLE_RULES['dark'];

  const colorGuidance = themeColors
    ? `\nTHEME COLORS:
- Primary: ${themeColors.primary}
- Accent: ${themeColors.accent}
- Background: ${themeColors.background}
- Text: ${themeColors.text}`
    : '';

  return `You are the Style Enforcer Agent for "${themeName}" presentations. Your job is to validate every slide against theme-specific design rules.

${themeRules}
${colorGuidance}

UNIVERSAL STYLE RULES (apply to ALL themes):
- Title must not be generic ("Overview", "Introduction", "Summary")
- No walls of text — max 80 words in body
- Bullet points must be parallel in grammatical structure
- No redundancy between title and first bullet
- imagePromptHint (if present) must match theme aesthetic
- Speaker notes must ADD value, not repeat slide content

SCORING:
- 1.0: Perfect adherence to theme rules
- 0.8+: Minor style issues (warnings only)
- 0.6-0.8: Needs fixes but slide is usable
- <0.6: Fails theme standards — must rewrite

Respond with valid JSON only:
{
  "verdict": "PASS" | "NEEDS_FIX",
  "score": 0.0-1.0,
  "issues": [
    {
      "rule": "title_format|color_usage|density|parallelism|contrast|redundancy|image_mismatch|citation|generic_title",
      "severity": "warning" | "error",
      "message": "Specific description of the violation",
      "fix": "Concrete suggestion for how to fix it"
    }
  ],
  "rewrittenTitle": "Only if title needs fixing, otherwise null",
  "rewrittenBody": "Only if body needs fixing, otherwise null"
}`;
}

export interface StyleEnforcerResult {
  verdict: 'PASS' | 'NEEDS_FIX';
  score: number;
  issues: Array<{
    rule: string;
    severity: 'warning' | 'error';
    message: string;
    fix: string;
  }>;
  rewrittenTitle: string | null;
  rewrittenBody: string | null;
}

export function isValidStyleEnforcerResult(data: unknown): data is StyleEnforcerResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (obj['verdict'] !== 'PASS' && obj['verdict'] !== 'NEEDS_FIX') return false;
  if (typeof obj['score'] !== 'number') return false;
  if (!Array.isArray(obj['issues'])) return false;
  return true;
}

// ── Narrative Coherence Agent ─────────────────────────────────

export function buildNarrativeCoherencePrompt(
  presentationType: string,
  frameworkName?: string,
): string {
  const frameworkGuidance = frameworkName
    ? `\nSTORY FRAMEWORK: "${frameworkName}" — validate that the slide sequence follows this framework's prescribed arc.`
    : '';

  return `You are the Narrative Coherence Agent. You review an ENTIRE presentation for story arc, logical flow, and structural integrity.
${frameworkGuidance}

PRESENTATION TYPE: ${presentationType}

CHECKS:
1. STORY ARC: Does the deck follow a clear progression? (Setup → Tension → Resolution)
2. LOGICAL FLOW: Does each slide naturally lead to the next? Flag abrupt topic jumps.
3. REDUNDANCY: Are any two slides covering the same concept? Flag for merge.
4. MISSING TRANSITIONS: Is there a gap where the audience would be confused?
5. BALANCE: Are some sections disproportionately long/short compared to their importance?
6. OPENING: Does slide 1 hook the audience? (Not a generic "Agenda" or "Table of Contents")
7. CLOSING: Does the last slide have a clear call-to-action or memorable takeaway?
8. FRAMEWORK COMPLIANCE: If a story framework is specified, does the sequence match it?
9. ENGAGEMENT PLAN: For business/pitch presentations, is there at least one slide that explicitly addresses HOW the audience will engage, adopt, implement, or buy? Look for: adoption path, sales cycle, implementation timeline, customer success model. Flag as ERROR if this is completely missing from the middle section of the deck.
10. TITLE-ONLY NARRATIVE: Read ONLY the slide titles in order. Do they tell a complete, coherent story? If a reader skipping all body content would be confused about the "so what" or "how", flag the specific titles that break the narrative thread.

Respond with valid JSON only:
{
  "overallScore": 0.0-1.0,
  "arcAssessment": "Brief description of the narrative arc quality",
  "issues": [
    {
      "type": "redundancy|gap|imbalance|weak_opening|weak_closing|framework_violation|abrupt_transition",
      "severity": "warning" | "error",
      "slideNumbers": [1, 2],
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "suggestedReorders": [
    {
      "from": 5,
      "to": 3,
      "reason": "This context is needed before the comparison slide"
    }
  ]
}`;
}

export interface NarrativeCoherenceResult {
  overallScore: number;
  arcAssessment: string;
  issues: Array<{
    type: string;
    severity: 'warning' | 'error';
    slideNumbers: number[];
    message: string;
    suggestion: string;
  }>;
  suggestedReorders: Array<{
    from: number;
    to: number;
    reason: string;
  }>;
}

export function isValidNarrativeCoherenceResult(data: unknown): data is NarrativeCoherenceResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj['overallScore'] !== 'number') return false;
  if (typeof obj['arcAssessment'] !== 'string') return false;
  if (!Array.isArray(obj['issues'])) return false;
  return true;
}

// ── Fact Checker Agent ────────────────────────────────────────

export function buildFactCheckerPrompt(kbContext: string): string {
  return `You are the Fact Checker Agent. You verify claims in presentation slides against the Knowledge Base (Pitch DB).

KNOWLEDGE BASE CONTEXT (ground truth):
${kbContext || '(No KB context available — flag all specific claims as UNVERIFIED)'}

YOUR TASK:
1. Extract every factual claim from the slide (numbers, percentages, company names, product features, dates, rankings)
2. Cross-reference each claim against the Knowledge Base context above
3. Flag claims that:
   - CONTRADICT the KB ("slide says 40% but KB says 25%")
   - Are NOT FOUND in the KB (may be hallucinated)
   - Are VAGUE when KB has specific data ("significant growth" when KB says "42% growth")
4. Do NOT flag:
   - Subjective assessments or opinions
   - Well-known public facts (e.g., "AWS is a cloud provider")
   - Future predictions (unless contradicted by current data)

SCORING:
- 1.0: All claims verified or no factual claims present
- 0.8+: Minor issues (vague wording when specific data exists)
- 0.5-0.8: Some unverified claims
- <0.5: Contains contradictions with KB data

Respond with valid JSON only:
{
  "verdict": "VERIFIED" | "NEEDS_REVIEW" | "HAS_ERRORS",
  "score": 0.0-1.0,
  "claims": [
    {
      "claim": "The exact text of the factual claim",
      "status": "verified" | "unverified" | "contradicted" | "vague",
      "kbEvidence": "The matching KB text, or null if not found",
      "correction": "Suggested correction if contradicted/vague, or null"
    }
  ]
}`;
}

export interface FactCheckerResult {
  verdict: 'VERIFIED' | 'NEEDS_REVIEW' | 'HAS_ERRORS';
  score: number;
  claims: Array<{
    claim: string;
    status: 'verified' | 'unverified' | 'contradicted' | 'vague';
    kbEvidence: string | null;
    correction: string | null;
  }>;
}

export function isValidFactCheckerResult(data: unknown): data is FactCheckerResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!['VERIFIED', 'NEEDS_REVIEW', 'HAS_ERRORS'].includes(obj['verdict'] as string)) return false;
  if (typeof obj['score'] !== 'number') return false;
  if (!Array.isArray(obj['claims'])) return false;
  return true;
}
