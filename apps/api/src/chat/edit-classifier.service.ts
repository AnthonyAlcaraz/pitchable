import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';

export interface ClassificationResult {
  type: 'cosmetic' | 'structural';
  reason: string;
}

const CLASSIFIER_SYSTEM_PROMPT = `You are a slide-edit classifier. Given a slide's content, the user's edit instruction, and the deck outline, determine if the change is COSMETIC or STRUCTURAL.

COSMETIC changes affect only the target slide's surface:
- Rewording, rephrasing, tone tweaks
- Fixing typos, grammar, punctuation
- Updating a single data point or statistic
- Reformatting bullets, adjusting bold/emphasis
- Minor additions within the same topic

STRUCTURAL changes alter the narrative arc and affect downstream slides:
- Changing the slide's core argument or thesis
- Switching the slide's topic entirely (e.g., "pricing" → "competitive analysis")
- Reordering the argument flow or narrative sequence
- Changing the target audience framing
- Adding or removing entire sections/concepts
- Changing the slide's purpose (e.g., "problem" → "solution")

Respond with valid JSON only:
{
  "type": "cosmetic" | "structural",
  "reason": "Brief explanation of why this is cosmetic/structural"
}

No markdown fences, no explanation outside JSON.`;

function isValidClassification(data: unknown): data is ClassificationResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (obj['type'] !== 'cosmetic' && obj['type'] !== 'structural') return false;
  if (typeof obj['reason'] !== 'string' || obj['reason'].length === 0) return false;
  return true;
}

@Injectable()
export class EditClassifierService {
  private readonly logger = new Logger(EditClassifierService.name);

  constructor(private readonly llm: LlmService) {}

  async classify(
    slideContent: { title: string; body: string; slideType: string },
    feedback: string,
    deckOutline: Array<{ slideNumber: number; title: string; slideType: string }>,
  ): Promise<ClassificationResult> {
    const outlineText = deckOutline
      .map((s) => `  ${s.slideNumber}. [${s.slideType}] ${s.title}`)
      .join('\n');

    const userPrompt = `CURRENT SLIDE:
Title: ${slideContent.title}
Body: ${slideContent.body}
Type: ${slideContent.slideType}

DECK OUTLINE:
${outlineText}

USER'S EDIT INSTRUCTION:
${feedback}

Classify this edit as "cosmetic" or "structural".`;

    try {
      return await this.llm.completeJson<ClassificationResult>(
        [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.OPUS,
        isValidClassification,
        1,
      );
    } catch (err) {
      this.logger.warn(
        `Classification failed, defaulting to cosmetic: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return { type: 'cosmetic', reason: 'Classification failed, treating as cosmetic edit.' };
    }
  }
}
