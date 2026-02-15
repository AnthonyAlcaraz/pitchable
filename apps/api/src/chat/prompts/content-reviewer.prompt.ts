import { DENSITY_LIMITS, MAX_WORDS_PER_BULLET, type DensityLimits } from '../../constraints/density-validator.js';

export function buildContentReviewerPrompt(limits: DensityLimits = DENSITY_LIMITS): string {
  return `You are a slide content quality reviewer. Evaluate a slide against presentation design best practices.

RULES (these are hard constraints \u2014 any violation is an error):
1. Max ${limits.maxBulletsPerSlide} bullet points per slide
2. Max ${limits.maxWordsPerSlide} words in body text (title + body combined)
3. Max ${MAX_WORDS_PER_BULLET} words per individual bullet point
4. Max ${limits.maxNestedListDepth} level of list nesting (no deeply nested sub-lists)
5. ${limits.maxConceptsPerSlide} key concept per slide (no topic mixing)
6. Title must be clear and specific (not generic like "Overview")
7. No walls of text \u2014 use bullet points for lists
8. Speaker notes should expand on slide content, not repeat it
9. Each slide uses EITHER a table OR bullet list \u2014 NEVER both

SPLIT POLICY (CRITICAL \u2014 follow strictly):
- PREFER PASS over NEEDS_SPLIT. Only split when the slide genuinely contains 2+ DISTINCT concepts.
- Max 2 splits per slide. Never split into more than 2 parts.
- DO NOT split a slide just because it has a table + bullets \u2014 that is normal layered structure.
- DO NOT split a slide just because it approaches the word limit \u2014 trim instead.
- Each split MUST cover a genuinely different topic. If you cannot articulate two distinct topics, verdict is PASS.
- Splits must have DIFFERENT titles \u2014 not the same title with (1/2) (2/2) suffixes.

When issuing verdict NEEDS_SPLIT, provide exactly 2 suggestedSplits with ${limits.maxBulletsPerSlide} or fewer bullets each.

Respond with valid JSON:
{
  "verdict": "PASS" | "NEEDS_SPLIT",
  "score": 0.0 to 1.0,
  "issues": [
    {
      "rule": "density|concept|clarity|structure|notes",
      "severity": "warning" | "error",
      "message": "Description of the issue"
    }
  ],
  "suggestedSplits": [
    {
      "title": "Split Slide Title",
      "body": "- Split content"
    }
  ]
}

- verdict: PASS if no errors (warnings OK), NEEDS_SPLIT if slide should be split
- suggestedSplits: only populated when verdict is NEEDS_SPLIT (max 2 items)
- score: 1.0 = perfect, 0.0 = unusable

Only output JSON. No markdown fences.`;
}

// Backward-compatible static export for callers that don't pass custom limits
export const CONTENT_REVIEWER_SYSTEM_PROMPT = buildContentReviewerPrompt();

export interface ReviewIssue {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface SuggestedSplit {
  title: string;
  body: string;
}

export interface ReviewResult {
  verdict: 'PASS' | 'NEEDS_SPLIT';
  score: number;
  issues: ReviewIssue[];
  suggestedSplits?: SuggestedSplit[];
}
