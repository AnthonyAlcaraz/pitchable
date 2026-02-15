import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { LlmService, LlmModel } from '../chat/llm.service.js';
import { ContextBuilderService } from '../chat/context-builder.service.js';
import { PitchLensService } from './pitch-lens.service.js';
import { recommendFrameworks } from './frameworks/framework-recommender.js';
import {
  buildLensInferenceSystemPrompt,
  buildLensInferenceUserPrompt,
} from './prompts/lens-inference.prompt.js';
import type {
  AudienceType,
  PitchGoal,
  CompanyStage,
  TechnicalLevel,
  StoryFramework,
  ToneStyle,
} from '../../generated/prisma/enums.js';

// ── Response types ──────────────────────────────────────────

export interface LensInferenceResult {
  recommendedLens: {
    audienceType: AudienceType;
    pitchGoal: PitchGoal;
    industry: string;
    companyStage: CompanyStage;
    toneStyle: ToneStyle;
    technicalLevel: TechnicalLevel;
    selectedFramework: StoryFramework;
    reasoning: string;
  };
  alternativeFrameworks: Array<{
    frameworkId: string;
    reasoning: string;
  }>;
  narrativeStructure: {
    suggestedSlides: string[];
    kbThemes: string[];
    dataRichAreas: string[];
    narrativeGaps: string[];
  };
}

// ── Validator ───────────────────────────────────────────────

const VALID_AUDIENCE_TYPES = new Set([
  'INVESTORS', 'CUSTOMERS', 'EXECUTIVES', 'BOARD', 'TEAM', 'CONFERENCE', 'TECHNICAL',
]);
const VALID_PITCH_GOALS = new Set([
  'RAISE_FUNDING', 'SELL_PRODUCT', 'GET_BUYIN', 'REPORT_RESULTS', 'INSPIRE', 'EDUCATE',
]);
const VALID_COMPANY_STAGES = new Set(['IDEA', 'MVP', 'GROWTH', 'ENTERPRISE']);
const VALID_TONE_STYLES = new Set([
  'FORMAL', 'CONVERSATIONAL', 'BOLD', 'INSPIRATIONAL', 'ANALYTICAL', 'STORYTELLING',
]);
const VALID_TECHNICAL_LEVELS = new Set([
  'NON_TECHNICAL', 'SEMI_TECHNICAL', 'TECHNICAL', 'HIGHLY_TECHNICAL',
]);
const VALID_FRAMEWORKS = new Set([
  'HEROS_JOURNEY', 'MINTO_PYRAMID', 'RESONATE', 'PAS', 'BAB', 'STAR',
  'PIXAR_PITCH', 'MCKINSEY_SCR', 'POPP', 'KAWASAKI_10_20_30',
  'WHAT_SO_WHAT_NOW_WHAT', 'TALK_LIKE_TED',
]);

function isValidLensInference(data: unknown): data is LensInferenceResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  const lens = obj.recommendedLens as Record<string, unknown> | undefined;
  if (!lens) return false;
  if (!VALID_AUDIENCE_TYPES.has(lens.audienceType as string)) return false;
  if (!VALID_PITCH_GOALS.has(lens.pitchGoal as string)) return false;
  if (!VALID_COMPANY_STAGES.has(lens.companyStage as string)) return false;
  if (!VALID_TONE_STYLES.has(lens.toneStyle as string)) return false;
  if (!VALID_TECHNICAL_LEVELS.has(lens.technicalLevel as string)) return false;
  if (!VALID_FRAMEWORKS.has(lens.selectedFramework as string)) return false;
  if (typeof lens.reasoning !== 'string') return false;
  if (typeof lens.industry !== 'string') return false;

  const narr = obj.narrativeStructure as Record<string, unknown> | undefined;
  if (!narr) return false;
  if (!Array.isArray(narr.suggestedSlides)) return false;
  if (!Array.isArray(narr.kbThemes)) return false;

  return true;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class PitchLensAgentService {
  private readonly logger = new Logger(PitchLensAgentService.name);

  constructor(
    @Inject(forwardRef(() => LlmService))
    private readonly llm: LlmService,
    @Inject(forwardRef(() => ContextBuilderService))
    private readonly contextBuilder: ContextBuilderService,
    private readonly pitchLensService: PitchLensService,
  ) {}

  /**
   * Analyze KB content and topic to infer the optimal Pitch Lens configuration.
   * Uses LLM to analyze document themes, detect audience, score frameworks,
   * and map KB content to narrative phases.
   */
  async inferFromBrief(
    userId: string,
    briefId: string | undefined,
    topic: string,
    audienceHint?: string,
  ): Promise<LensInferenceResult> {
    // 1. Retrieve KB content for analysis
    const kbContent = briefId
      ? await this.contextBuilder.retrieveBriefContext(userId, briefId, topic, 12)
      : await this.contextBuilder.retrieveEnrichedContext(userId, topic, 8, 5);

    // 2. Build prompts
    const systemPrompt = buildLensInferenceSystemPrompt();
    const userPrompt = buildLensInferenceUserPrompt(topic, kbContent, audienceHint);

    // 3. Call LLM with JSON validation
    let inference: LensInferenceResult;
    try {
      inference = await this.llm.completeJson<LensInferenceResult>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.SONNET,
        isValidLensInference,
        2, // max retries
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`LLM lens inference failed: ${msg}, falling back to rule-based`);
      return this.fallbackInference(topic, audienceHint);
    }

    // 4. Cross-validate with rule-based recommender
    const ruleBasedRecs = recommendFrameworks(
      inference.recommendedLens.audienceType,
      inference.recommendedLens.pitchGoal,
      inference.recommendedLens.companyStage,
      inference.recommendedLens.technicalLevel,
    );

    // If rule-based top pick differs from LLM pick, add it to alternatives
    const ruleTopId = ruleBasedRecs[0]?.framework.id;
    if (ruleTopId && ruleTopId !== inference.recommendedLens.selectedFramework) {
      const alreadyListed = inference.alternativeFrameworks.some(
        (a) => a.frameworkId === ruleTopId,
      );
      if (!alreadyListed) {
        inference.alternativeFrameworks.push({
          frameworkId: ruleTopId,
          reasoning: `Rule-based recommender top pick (score: ${ruleBasedRecs[0].score}). ${ruleBasedRecs[0].reasons.join('. ')}`,
        });
      }
    }

    this.logger.log(
      `Lens inference for "${topic}": ${inference.recommendedLens.selectedFramework} ` +
      `(audience=${inference.recommendedLens.audienceType}, goal=${inference.recommendedLens.pitchGoal})`,
    );

    return inference;
  }

  /**
   * Create a Pitch Lens from inference results and link it to a presentation.
   */
  async createLensFromInference(
    userId: string,
    presentationId: string,
    topic: string,
    inference: LensInferenceResult,
  ): Promise<string> {
    const lens = inference.recommendedLens;

    // Create the Pitch Lens
    const created = await this.pitchLensService.create(userId, {
      name: `Auto: ${topic.slice(0, 70)}`,
      description: lens.reasoning,
      audienceType: lens.audienceType,
      pitchGoal: lens.pitchGoal,
      industry: lens.industry,
      companyStage: lens.companyStage,
      toneStyle: lens.toneStyle,
      technicalLevel: lens.technicalLevel,
      selectedFramework: lens.selectedFramework,
    });

    this.logger.log(`Created auto Pitch Lens ${created.id} for presentation ${presentationId}`);
    return created.id;
  }

  /**
   * Fallback: rule-based inference when LLM fails.
   * Detects basic patterns from topic string.
   */
  private fallbackInference(
    topic: string,
    audienceHint?: string,
  ): LensInferenceResult {
    const topicLower = topic.toLowerCase();

    // Simple heuristics for audience detection
    let audienceType: AudienceType = 'EXECUTIVES';
    let pitchGoal: PitchGoal = 'GET_BUYIN';
    let companyStage: CompanyStage = 'GROWTH';
    let toneStyle: ToneStyle = 'ANALYTICAL';
    let technicalLevel: TechnicalLevel = 'SEMI_TECHNICAL';

    if (audienceHint) {
      const hint = audienceHint.toLowerCase();
      if (hint.includes('investor') || hint.includes('vc')) {
        audienceType = 'INVESTORS';
        pitchGoal = 'RAISE_FUNDING';
      } else if (hint.includes('customer') || hint.includes('client')) {
        audienceType = 'CUSTOMERS';
        pitchGoal = 'SELL_PRODUCT';
      } else if (hint.includes('technical') || hint.includes('engineer')) {
        audienceType = 'TECHNICAL';
        technicalLevel = 'TECHNICAL';
      }
    }

    if (topicLower.includes('funding') || topicLower.includes('pitch') || topicLower.includes('raise')) {
      audienceType = 'INVESTORS';
      pitchGoal = 'RAISE_FUNDING';
      toneStyle = 'BOLD';
    }
    if (topicLower.includes('api') || topicLower.includes('architecture') || topicLower.includes('technical')) {
      technicalLevel = 'TECHNICAL';
    }
    if (topicLower.includes('startup') || topicLower.includes('mvp')) {
      companyStage = 'MVP';
    }

    // Get rule-based recommendation
    const recs = recommendFrameworks(audienceType, pitchGoal, companyStage, technicalLevel);
    const topFramework = recs[0]?.framework;

    return {
      recommendedLens: {
        audienceType,
        pitchGoal,
        industry: 'Technology',
        companyStage,
        toneStyle,
        technicalLevel,
        selectedFramework: topFramework?.id ?? ('MINTO_PYRAMID' as StoryFramework),
        reasoning: `Fallback inference based on topic analysis. ${recs[0]?.reasons.join('. ') ?? ''}`,
      },
      alternativeFrameworks: recs.slice(1, 3).map((r) => ({
        frameworkId: r.framework.id,
        reasoning: r.reasons.join('. '),
      })),
      narrativeStructure: {
        suggestedSlides: topFramework?.slideStructure ?? [],
        kbThemes: [],
        dataRichAreas: [],
        narrativeGaps: ['No KB content available for gap analysis'],
      },
    };
  }
}
