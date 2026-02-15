import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';
import {
  CONTENT_REVIEWER_SYSTEM_PROMPT,
} from './prompts/content-reviewer.prompt.js';
import type { ReviewResult } from './prompts/content-reviewer.prompt.js';
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
  async reviewSlide(slide: SlideInput): Promise<ReviewResult> {
    const slideDescription = `Title: ${slide.title}
Type: ${slide.slideType}
Body:
${slide.body}
Speaker Notes: ${slide.speakerNotes}`;

    try {
      const result = await this.llm.completeJson<ReviewResult>(
        [
          { role: 'system', content: CONTENT_REVIEWER_SYSTEM_PROMPT },
          { role: 'user', content: `Review this slide:\n\n${slideDescription}` },
        ],
        LlmModel.HAIKU,
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
      this.logger.warn(`Content review failed, defaulting to PASS: ${err}`);
      return {
        verdict: 'PASS',
        score: 1.0,
        issues: [],
      };
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
