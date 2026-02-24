import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel, type JsonValidator } from '../chat/llm.service.js';
import { FIGMA_GRADE_TYPES } from './html-slide-templates.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';

interface RendererOverride {
  slideNumber: number;
  template: string;
}

interface RendererChooserResponse {
  overrides: RendererOverride[];
}

const VALID_TEMPLATES = Array.from(FIGMA_GRADE_TYPES);

const SYSTEM_PROMPT = `You analyze presentation slides and decide if any would look better rendered with a specialized visual template instead of standard CSS.

Available templates (only suggest these):
- MARKET_SIZING: Data with TAM/SAM/SOM, market sizes, concentric segments
- TIMELINE: Sequential events with dates (format: "date: description")
- METRICS_HIGHLIGHT: One big hero number with supporting metrics
- COMPARISON: Two-sided comparison (before/after, option A vs B)
- TEAM: People with names and roles (format: "Name - Role")
- FEATURE_GRID: Feature list with title: description pairs

For each slide, decide: does the CONTENT match a template better than standard bullet/text rendering? Only override when clearly beneficial.

Return JSON: { "overrides": [{ "slideNumber": N, "template": "TEMPLATE_NAME" }] }
Return empty overrides array if no slides benefit from a template change.`;

function isValidResponse(data: unknown): data is RendererChooserResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.overrides)) return false;
  for (const item of obj.overrides) {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    if (typeof o.slideNumber !== 'number') return false;
    if (typeof o.template !== 'string') return false;
    if (!VALID_TEMPLATES.includes(o.template)) return false;
  }
  return true;
}

@Injectable()
export class RendererChooserService {
  private readonly logger = new Logger(RendererChooserService.name);

  constructor(private readonly llm: LlmService) {}

  /**
   * Analyze slides and return a Map of slideNumber → template override.
   * Only non-FIGMA_GRADE slides are analyzed (those already have a template).
   * Returns empty map on any failure — no export breakage.
   */
  async chooseRenderers(slides: SlideModel[]): Promise<Map<number, string>> {
    // SPLIT_STATEMENT has its own scoped CSS — never override it
    const SKIP_OVERRIDE = new Set([...FIGMA_GRADE_TYPES, 'SPLIT_STATEMENT', 'SECTION_DIVIDER', 'VISUAL_HUMOR', 'DATA_METRICS']);
    const candidates = slides.filter(
      (s) => !SKIP_OVERRIDE.has(s.slideType),
    );

    if (candidates.length === 0) {
      return new Map();
    }

    const slideDescriptions = candidates.map((s) => {
      const body = (s.body || '').trim();
      const preview = body.length > 500 ? body.slice(0, 500) + '...' : body;
      return `Slide ${s.slideNumber} (type: ${s.slideType}):\nTitle: ${s.title}\nBody: ${preview}`;
    }).join('\n\n---\n\n');

    try {
      const response = await this.llm.completeJson<RendererChooserResponse>(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze these slides:\n\n${slideDescriptions}` },
        ],
        LlmModel.SONNET,
        isValidResponse as JsonValidator<RendererChooserResponse>,
        1,
      );

      const overrides = new Map<number, string>();
      for (const o of response.overrides) {
        // Double-check: only override slides that aren't already FIGMA_GRADE
        const slide = slides.find((s) => s.slideNumber === o.slideNumber);
        if (slide && !FIGMA_GRADE_TYPES.has(slide.slideType)) {
          overrides.set(o.slideNumber, o.template);
        }
      }

      if (overrides.size > 0) {
        this.logger.log(
          `AI renderer chooser: ${overrides.size} override(s) — ` +
          Array.from(overrides.entries()).map(([n, t]) => `slide ${n} → ${t}`).join(', '),
        );
      }

      return overrides;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Renderer chooser failed (falling back to defaults): ${msg}`);
      return new Map();
    }
  }
}
