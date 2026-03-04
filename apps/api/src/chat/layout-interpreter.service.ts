import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';
import { isValidLayoutOverrides, type LayoutOverrides } from './layout-overrides.js';

interface SlideContext {
  slideType: string;
  title: string;
  hasImage: boolean;
}

const SYSTEM_PROMPT = `You are a layout interpreter for a presentation builder. Convert the user's natural language instruction into structured layout overrides.

Return a JSON object with ONLY the fields that need to change. Omit fields the user did not mention.

Available fields:
- accentColor: hex color string (e.g. "#3b82f6") — changes accent/highlight color
- backgroundColor: hex color string — changes slide background
- textColor: hex color string — changes body text color
- fontScale: number between 0.75 and 1.5 — scales all font sizes (1.0 = default, 1.25 = 25% bigger, 0.8 = 20% smaller)
- imagePosition: "right" | "left" | "background" | "hidden" — controls image placement
- spacing: "compact" | "default" | "spacious" — controls padding/gap density
- slideType: one of the valid slide types — changes the slide layout type

Valid slideTypes: TITLE, PROBLEM, SOLUTION, ARCHITECTURE, PROCESS, COMPARISON, DATA_METRICS, CTA, CONTENT, QUOTE, VISUAL_HUMOR, OUTLINE, TEAM, TIMELINE, SECTION_DIVIDER, METRICS_HIGHLIGHT, FEATURE_GRID, PRODUCT_SHOWCASE, LOGO_WALL, MARKET_SIZING, SPLIT_STATEMENT, MATRIX_2X2, WATERFALL, FUNNEL, COMPETITIVE_MATRIX, ROADMAP, PRICING_TABLE, UNIT_ECONOMICS, SWOT, THREE_PILLARS, HOOK, BEFORE_AFTER, SOCIAL_PROOF, OBJECTION_HANDLER, FAQ, VERDICT, COHORT_TABLE, PROGRESS_TRACKER, FLYWHEEL, REVENUE_MODEL, CUSTOMER_JOURNEY, TECH_STACK, GROWTH_LOOPS, CASE_STUDY, HIRING_PLAN, USE_OF_FUNDS, RISK_MITIGATION, DEMO_SCREENSHOT, MILESTONE_TIMELINE, PARTNERSHIP_LOGOS, FINANCIAL_PROJECTION, GO_TO_MARKET, PERSONA, TESTIMONIAL_WALL, THANK_YOU, SCENARIO_ANALYSIS, VALUE_CHAIN, GEOGRAPHIC_MAP, IMPACT_SCORECARD, EXIT_STRATEGY, ORG_CHART, FEATURE_COMPARISON, DATA_TABLE, ECOSYSTEM_MAP, KPI_DASHBOARD, REFERENCES, ABSTRACT, MYTH_VS_REALITY, NUMBER_STORY, STORY_ARC, TREND_INSIGHT, CONTRARIAN_VIEW

Examples:
- "make the font bigger" → { "fontScale": 1.25 }
- "use blue accents" → { "accentColor": "#3b82f6" }
- "dark background" → { "backgroundColor": "#1e1e2e", "textColor": "#e2e8f0" }
- "remove the image" → { "imagePosition": "hidden" }
- "put image on the left" → { "imagePosition": "left" }
- "more compact" → { "spacing": "compact" }
- "change to a grid layout" → { "slideType": "FEATURE_GRID" }
- "make it a timeline" → { "slideType": "TIMELINE" }

Only output valid JSON. No explanation.`;

@Injectable()
export class LayoutInterpreterService {
  private readonly logger = new Logger(LayoutInterpreterService.name);

  constructor(private readonly llm: LlmService) {}

  async interpret(instruction: string, context: SlideContext): Promise<LayoutOverrides> {
    const userContent = `Current slide: type=${context.slideType}, title="${context.title}", hasImage=${context.hasImage}.
Instruction: ${instruction}`;

    try {
      const result = await Promise.race([
        this.llm.completeJson<LayoutOverrides>(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          LlmModel.SONNET,
          isValidLayoutOverrides,
          2,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Layout interpretation timed out after 10s')), 10_000),
        ),
      ]);

      return result;
    } catch (err) {
      this.logger.warn(`Layout interpretation failed: ${err instanceof Error ? err.message : 'unknown'}`);
      return {};
    }
  }
}
