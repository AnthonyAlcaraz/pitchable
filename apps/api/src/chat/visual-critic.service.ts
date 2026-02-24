import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';
import {
  VISUAL_CRITIC_SYSTEM_PROMPT,
  type VisualCriticResult,
} from './prompts/visual-critic.prompt.js';

function isValidVisualCriticResult(data: unknown): data is VisualCriticResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.overallScore === 'number' &&
    d.overallScore >= 0 &&
    d.overallScore <= 1 &&
    Array.isArray(d.issues) &&
    typeof d.diversityScore === 'number' &&
    typeof d.aestheticScore === 'number'
  );
}

@Injectable()
export class VisualCriticService {
  private readonly logger = new Logger(VisualCriticService.name);

  constructor(private readonly llm: LlmService) {}

  /**
   * Review the full Marp markdown of a presentation for visual quality,
   * aesthetics, and layout diversity.
   * Returns a structured critique with per-slide issues and overall scores.
   */
  async reviewPresentation(marpMarkdown: string, slideCount: number): Promise<VisualCriticResult> {
    // Truncate to avoid context overflow — keep frontmatter + first 20 slides
    const truncated = marpMarkdown.length > 15000
      ? marpMarkdown.substring(0, 15000) + '\n\n[... truncated ...]'
      : marpMarkdown;

    try {
      const result = await this.llm.completeJson<VisualCriticResult>(
        [
          { role: 'system', content: VISUAL_CRITIC_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Review this ${slideCount}-slide presentation Marp markdown for visual quality, aesthetics, and diversity:\n\n${truncated}`,
          },
        ],
        LlmModel.OPUS,
        isValidVisualCriticResult,
        2,
      );

      this.logger.log(
        `[VISUAL CRITIC] Overall: ${result.overallScore.toFixed(2)}, ` +
        `Aesthetic: ${result.aestheticScore.toFixed(2)}, ` +
        `Diversity: ${result.diversityScore.toFixed(2)}, ` +
        `Types: ${result.slideTypeCount}, BgVariants: ${result.uniqueBgVariants}, ` +
        `Issues: ${result.issues.length} ` +
        `(${result.issues.filter(i => i.severity === 'error').length} errors, ` +
        `${result.issues.filter(i => i.severity === 'warning').length} warnings)`,
      );

      return result;
    } catch (err) {
      this.logger.error(`Visual critic failed: ${err}`);
      // Return a neutral result rather than blocking export
      return {
        overallScore: 0.5,
        aestheticScore: 0.5,
        diversityScore: 0.5,
        issues: [{ slideNumber: 0, category: 'system', severity: 'warning', message: 'Visual critic failed to run', suggestion: 'Review manually' }],
        layoutDistribution: { bulletSlides: 0, tableSlides: 0, gridSlides: 0, imageSlides: 0, quoteSlides: 0, minimalSlides: 0 },
        slideTypeCount: 0,
        uniqueBgVariants: 0,
      };
    }
  }
}
