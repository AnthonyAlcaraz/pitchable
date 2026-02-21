import { LlmModel } from './llm.service.js';
import type { LlmModelId } from './llm.service.js';

/**
 * Tiered model routing per slide type.
 * HAIKU for structural/lightweight slides (~$0.80/$4 per MTok)
 * SONNET for content-heavy slides (~$3/$15 per MTok)
 * Saves ~30-40% LLM cost (6 of 12 slides use HAIKU).
 */
const HAIKU_SLIDE_TYPES = new Set([
  'TITLE',
  'CTA',
  'SECTION_DIVIDER',
  'OUTLINE',
  'QUOTE',
  'VISUAL_HUMOR',
]);

export function getModelForSlideType(slideType: string): LlmModelId {
  return HAIKU_SLIDE_TYPES.has(slideType) ? LlmModel.HAIKU : LlmModel.SONNET;
}
