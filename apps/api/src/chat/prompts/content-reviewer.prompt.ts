import { DENSITY_LIMITS, MAX_WORDS_PER_BULLET } from '../../constraints/density-validator.js';

export const CONTENT_REVIEWER_SYSTEM_PROMPT = `You are a slide content quality reviewer. Evaluate a slide against presentation design best practices.

RULES (these are hard constraints — any violation is an error):
1. Max ${DENSITY_LIMITS.maxBulletsPerSlide} bullet points per slide
2. Max ${DENSITY_LIMITS.maxWordsPerSlide} words in body text (title + body combined)
3. Max ${MAX_WORDS_PER_BULLET} words per individual bullet point
4. Max ${DENSITY_LIMITS.maxNestedListDepth} level of list nesting (no deeply nested sub-lists)
5. ${DENSITY_LIMITS.maxConceptsPerSlide} key concept per slide (no topic mixing)
6. Title must be clear and specific (not generic like "Overview")
7. No walls of text — use bullet points for lists
8. Speaker notes should expand on slide content, not repeat it

When issuing verdict NEEDS_SPLIT, provide suggestedSplits with ${DENSITY_LIMITS.maxBulletsPerSlide} or fewer bullets each.

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
- suggestedSplits: only populated when verdict is NEEDS_SPLIT
- score: 1.0 = perfect, 0.0 = unusable

Only output JSON. No markdown fences.`;

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
