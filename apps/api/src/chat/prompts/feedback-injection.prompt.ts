/**
 * Build a feedback injection block for system prompts.
 * Includes user's codified rules and recent corrections
 * so the LLM learns from past feedback.
 */
export function buildFeedbackInjection(
  rules: Array<{ category: string; rule: string }>,
  corrections: Array<{ category: string; original: string; corrected: string }>,
): string {
  if (rules.length === 0 && corrections.length === 0) return '';

  const parts: string[] = [];
  parts.push('\n## User Preferences (learned from feedback)\n');
  parts.push('IMPORTANT: Follow these preferences when generating content. They reflect what the user has explicitly corrected or requested in past sessions.\n');

  if (rules.length > 0) {
    parts.push('### Rules');
    for (const rule of rules) {
      parts.push(`- [${rule.category}] ${rule.rule}`);
    }
    parts.push('');
  }

  if (corrections.length > 0) {
    parts.push('### Recent Corrections');
    for (const correction of corrections) {
      const origSnippet = correction.original.slice(0, 120).replace(/\n/g, ' ');
      const corrSnippet = correction.corrected.slice(0, 120).replace(/\n/g, ' ');
      parts.push(`- [${correction.category}] "${origSnippet}" → "${corrSnippet}"`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Fetch user feedback data for injection.
 * Returns structured data ready for buildFeedbackInjection.
 */
export interface FeedbackData {
  rules: Array<{ category: string; rule: string }>;
  corrections: Array<{ category: string; original: string; corrected: string }>;
}
