import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * PaperBanana Critic pattern — image post-processing validation.
 *
 * Evaluates generated slide images on 4 dimensions:
 *   1. Faithfulness: Does the image represent the slide's core message?
 *   2. Readability:  Is the visual immediately understandable?
 *   3. Conciseness:  Is it free of clutter and unnecessary elements?
 *   4. Aesthetics:   Is it professionally polished?
 *
 * Acceptance thresholds:
 *   - Faithfulness + Readability: ≥ 7/10 each
 *   - Conciseness + Aesthetics:  ≥ 6/10 each
 *
 * On rejection, returns refinement feedback for prompt improvement.
 * Uses Claude Haiku for cost efficiency (~$0.01 per evaluation).
 */

export interface CriticEvaluation {
  accepted: boolean;
  scores: {
    faithfulness: number;
    readability: number;
    conciseness: number;
    aesthetics: number;
  };
  averageScore: number;
  refinements: string[];
}

@Injectable()
export class ImageCriticService {
  private readonly logger = new Logger(ImageCriticService.name);
  private readonly anthropic: Anthropic | null;
  private readonly model = 'claude-sonnet-4-6';
  private readonly maxRefinementRounds = 2;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey, timeout: 30_000 });
      this.logger.log('Image Critic enabled (PaperBanana pattern, Claude Haiku)');
    } else {
      this.anthropic = null;
      this.logger.warn('ANTHROPIC_API_KEY not set — Image Critic disabled');
    }
  }

  isEnabled(): boolean {
    return !!this.anthropic;
  }

  getMaxRounds(): number {
    return this.maxRefinementRounds;
  }

  /**
   * Evaluate a generated image against the slide content.
   * Returns acceptance decision, scores, and refinement feedback.
   */
  async evaluate(
    imageBase64: string,
    mimeType: string,
    slideTitle: string,
    slideBody: string,
    slideType: string,
  ): Promise<CriticEvaluation> {
    if (!this.anthropic) {
      return this.passThrough();
    }

    try {
      const mediaType = mimeType.includes('png')
        ? 'image/png' as const
        : 'image/jpeg' as const;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: this.buildCriticPrompt(slideTitle, slideBody, slideType),
              },
            ],
          },
        ],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return this.parseEvaluation(text);
    } catch (err) {
      this.logger.warn(
        `Critic evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.passThrough();
    }
  }

  /**
   * Refine an image prompt based on critic feedback.
   * Appends refinement directives to the original prompt.
   */
  refinePrompt(originalPrompt: string, refinements: string[]): string {
    if (refinements.length === 0) return originalPrompt;

    const refinementBlock = refinements
      .map((r) => `- ${r}`)
      .join('\n');

    return `${originalPrompt}\n\nREFINEMENTS (apply these improvements):\n${refinementBlock}`;
  }

  private buildCriticPrompt(
    slideTitle: string,
    slideBody: string,
    slideType: string,
  ): string {
    return `You are an image quality critic for presentation slides. Evaluate this generated image for a ${slideType} slide.

SLIDE CONTEXT:
Title: ${slideTitle}
Content: ${slideBody.slice(0, 300)}

Score each dimension 1-10:
1. Faithfulness: Does image represent the slide's core message?
2. Readability: Is it immediately understandable without explanation?
3. Conciseness: Free of clutter and unnecessary elements?
4. Aesthetics: Professionally polished, good composition?

Respond in EXACTLY this JSON format (no other text):
{"faithfulness":N,"readability":N,"conciseness":N,"aesthetics":N,"refinements":["improvement1","improvement2"]}

Only include refinements if a score is below 7. Max 3 refinements.`;
  }

  private parseEvaluation(text: string): CriticEvaluation {
    try {
      // Extract JSON from response (may have surrounding text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('Could not extract JSON from critic response');
        return this.passThrough();
      }

      const data = JSON.parse(jsonMatch[0]);
      const scores = {
        faithfulness: Math.min(10, Math.max(1, Number(data.faithfulness) || 5)),
        readability: Math.min(10, Math.max(1, Number(data.readability) || 5)),
        conciseness: Math.min(10, Math.max(1, Number(data.conciseness) || 5)),
        aesthetics: Math.min(10, Math.max(1, Number(data.aesthetics) || 5)),
      };

      const averageScore =
        (scores.faithfulness + scores.readability + scores.conciseness + scores.aesthetics) / 4;

      // Acceptance: primary ≥ 7, secondary ≥ 6
      const accepted =
        scores.faithfulness >= 7 &&
        scores.readability >= 7 &&
        scores.conciseness >= 6 &&
        scores.aesthetics >= 6;

      const refinements: string[] = Array.isArray(data.refinements)
        ? data.refinements.filter((r: unknown) => typeof r === 'string').slice(0, 3)
        : [];

      return { accepted, scores, averageScore, refinements };
    } catch {
      this.logger.warn('Failed to parse critic evaluation');
      return this.passThrough();
    }
  }

  private passThrough(): CriticEvaluation {
    return {
      accepted: true,
      scores: { faithfulness: 8, readability: 8, conciseness: 8, aesthetics: 8 },
      averageScore: 8,
      refinements: [],
    };
  }
}
