import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';
import {
  CONTENT_REVIEWER_SYSTEM_PROMPT,
  buildContentReviewerPrompt,
} from './prompts/content-reviewer.prompt.js';
import type { ReviewResult } from './prompts/content-reviewer.prompt.js';
import type { DensityLimits } from '../constraints/density-validator.js';
import { isValidReviewResult } from './validators.js';

interface SlideInput {
  title: string;
  body: string;
  speakerNotes: string;
  slideType: string;
}

@Injectable()
export class ContentReviewerService {
  private readonly logger = new Logger(ContentReviewerService.name);

  constructor(private readonly llm: LlmService) {}

  /**
   * Review a single slide for quality.
   */
  async reviewSlide(slide: SlideInput, customLimits?: DensityLimits): Promise<ReviewResult> {
    const slideDescription = `Title: ${slide.title}
Type: ${slide.slideType}
Body:
${slide.body}
Speaker Notes: ${slide.speakerNotes}`;

    try {
      const result = await this.llm.completeJson<ReviewResult>(
        [
          { role: 'system', content: customLimits ? buildContentReviewerPrompt(customLimits) : CONTENT_REVIEWER_SYSTEM_PROMPT },
          { role: 'user', content: `Review this slide:\n\n${slideDescription}` },
        ],
        LlmModel.OPUS,
        isValidReviewResult,
        2,
      );

      return {
        verdict: result.verdict || 'PASS',
        score: result.score ?? 1.0,
        issues: result.issues || [],
        suggestedSplits: result.suggestedSplits,
      };
    } catch (err) {
      this.logger.error(`Content review failed (blocking): ${err}`);
      // Re-throw so callers handle the failure explicitly instead of silent pass-through
      throw err;
    }
  }

  /**
   * Review all slides in a presentation and return aggregated results.
   */
  async reviewPresentation(
    slides: SlideInput[],
  ): Promise<{ results: Array<{ slideNumber: number; review: ReviewResult }>; passRate: number }> {
    const results: Array<{ slideNumber: number; review: ReviewResult }> = [];

    for (let i = 0; i < slides.length; i++) {
      const review = await this.reviewSlide(slides[i]);
      results.push({ slideNumber: i + 1, review });
    }

    const passCount = results.filter((r) => r.review.verdict === 'PASS').length;
    const passRate = slides.length > 0 ? passCount / slides.length : 1.0;

    return { results, passRate };
  }
}
