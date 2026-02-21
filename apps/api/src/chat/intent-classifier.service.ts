import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';

export type IntentType =
  | 'modify_slide'
  | 'add_slide'
  | 'delete_slide'
  | 'reorder_slides'
  | 'change_theme'
  | 'regenerate_slide'
  | 'generate_outline'
  | 'general_chat'
  | 'off_topic';

export interface ClassifiedIntent {
  intent: IntentType;
  slideNumber?: number;
  instruction?: string;
  confidence: number;
}

const CLASSIFICATION_PROMPT = `You are an intent classifier for a presentation builder AI. Classify the user's message into one of these intents:

- modify_slide: User wants to change content of a specific slide (e.g., "make slide 3 more concise", "add a bullet to slide 5")
- add_slide: User wants to add a new slide (e.g., "add a slide about pricing")
- delete_slide: User wants to remove a slide (e.g., "delete slide 4", "remove the last slide")
- reorder_slides: User wants to change slide order (e.g., "move slide 3 before slide 2")
- change_theme: User wants to change the visual theme (e.g., "use a dark theme", "make it more corporate")
- regenerate_slide: User wants to completely regenerate a slide (e.g., "redo slide 2", "start over on slide 5")
- generate_outline: User wants to create a new presentation (e.g., "create a deck about X")
- general_chat: Presentation-related questions or conversation (e.g., "how many slides should a pitch deck have?", "what's a good structure for a keynote?")
- off_topic: ANYTHING not related to presentations, slides, or decks (e.g., coding, math, recipes, personal advice, general knowledge, translations, creative writing, jokes)

IMPORTANT: Use "off_topic" aggressively for anything that is NOT about creating, editing, or discussing presentations. When in doubt between general_chat and off_topic, choose off_topic.

Respond with valid JSON:
{
  "intent": "modify_slide",
  "slideNumber": 3,
  "instruction": "make it more concise",
  "confidence": 0.9
}

Only output JSON. slideNumber is null if not specified or not applicable.`;

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(private readonly llm: LlmService) {}

  async classify(message: string, hasSlides: boolean): Promise<ClassifiedIntent> {
    try {
      const result = await this.llm.completeJson<ClassifiedIntent>(
        [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          {
            role: 'user',
            content: `Presentation has slides: ${hasSlides ? 'yes' : 'no (empty deck)'}.\nUser message: "${message}"`,
          },
        ],
        LlmModel.HAIKU,
      );

      return {
        intent: result.intent || 'general_chat',
        slideNumber: result.slideNumber ?? undefined,
        instruction: result.instruction ?? message,
        confidence: result.confidence ?? 0.5,
      };
    } catch (err) {
      this.logger.warn(`Intent classification failed, defaulting to general_chat: ${err}`);
      return {
        intent: 'general_chat',
        instruction: message,
        confidence: 0,
      };
    }
  }
}
