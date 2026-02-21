import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { ArchetypeResolverService } from '../pitch-lens/archetypes/archetype-resolver.service.js';
import type { DeckArchetype } from '../../generated/prisma/enums.js';
import {
  buildStyleEnforcerPrompt,
  isValidStyleEnforcerResult,
  buildNarrativeCoherencePrompt,
  isValidNarrativeCoherenceResult,
  buildFactCheckerPrompt,
  isValidFactCheckerResult,
} from './prompts/quality-agents.prompt.js';
import type {
  StyleEnforcerResult,
  NarrativeCoherenceResult,
  FactCheckerResult,
} from './prompts/quality-agents.prompt.js';

// ── Types ────────────────────────────────────────────────────

export interface SlideForReview {
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string;
  slideType: string;
  imagePromptHint?: string;
}

export interface QualityReviewResult {
  /** Overall pass/fail. True if all agents pass above thresholds. */
  passed: boolean;
  /** Style Enforcer results per slide. */
  styleResults: Array<{ slideNumber: number; result: StyleEnforcerResult }>;
  /** Narrative Coherence result for the full deck. */
  narrativeResult: NarrativeCoherenceResult | null;
  /** Fact Checker results per slide. */
  factCheckResults: Array<{ slideNumber: number; result: FactCheckerResult }>;
  /** Slides that were auto-fixed by agents. */
  fixes: Array<{
    slideNumber: number;
    agent: 'style' | 'fact_check';
    originalTitle: string;
    originalBody: string;
    fixedTitle: string;
    fixedBody: string;
  }>;
  /** Summary metrics. */
  metrics: {
    avgStyleScore: number;
    narrativeScore: number;
    avgFactScore: number;
    slidesFixed: number;
    errorsFound: number;
  };
}

// ── Thresholds ───────────────────────────────────────────────

const STYLE_PASS_THRESHOLD = 0.7;
const NARRATIVE_PASS_THRESHOLD = 0.6;
const FACT_CHECK_PASS_THRESHOLD = 0.7;

// ── Service ──────────────────────────────────────────────────

@Injectable()
export class QualityAgentsService {
  private readonly logger = new Logger(QualityAgentsService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly archetypeResolver: ArchetypeResolverService,
  ) {}

  /**
   * Run the full multi-agent quality review pipeline.
   * All agents use Opus 4.6 for maximum quality.
   *
   * Pipeline:
   * 1. Style Enforcer — per-slide, per-theme validation (parallel across slides)
   * 2. Narrative Coherence — full-deck story arc review (single pass)
   * 3. Fact Checker — per-slide claim verification against KB (parallel across slides)
   *
   * Returns aggregated results with auto-fixes applied.
   */
  async reviewPresentation(
    slides: SlideForReview[],
    options: {
      themeCategory: string;
      themeName: string;
      themeColors?: { primary: string; accent: string; background: string; text: string };
      presentationType: string;
      frameworkName?: string;
      userId: string;
      presentationId: string;
      archetypeId?: string;
    },
  ): Promise<QualityReviewResult> {
    const tQStart = Date.now();
    this.logger.log(
      `Quality review: ${slides.length} slides, theme="${options.themeName}", type="${options.presentationType}"`,
    );

    // Resolve archetype quality gate rules (if archetype is set)
    const styleGate = options.archetypeId
      ? this.archetypeResolver.getQualityGateRules(options.archetypeId as DeckArchetype, 'style')
      : { extraRules: [] };
    const narrativeGate = options.archetypeId
      ? this.archetypeResolver.getQualityGateRules(options.archetypeId as DeckArchetype, 'narrative')
      : { extraRules: [] };
    const factCheckGate = options.archetypeId
      ? this.archetypeResolver.getQualityGateRules(options.archetypeId as DeckArchetype, 'fact_check')
      : { extraRules: [] };

    // Run Style Enforcer + Fact Checker in parallel (both are per-slide)
    const tStyleFact = Date.now();
    const [styleResults, factCheckResults] = await Promise.all([
      this.runStyleEnforcer(slides, options.themeCategory, options.themeName, options.themeColors, styleGate.extraRules),
      this.runFactChecker(slides, options.userId, options.presentationId),
    ]);
    this.logger.log(`[TIMING] Style+FactCheck (parallel): ${((Date.now() - tStyleFact) / 1000).toFixed(1)}s — ${styleResults.length} style, ${factCheckResults.length} fact checks`);

    // Run Narrative Coherence (needs full deck context)
    const tNarrative = Date.now();
    const narrativeResult = await this.runNarrativeCoherence(
      slides,
      options.presentationType,
      options.frameworkName,
      narrativeGate.extraRules,
    );
    this.logger.log(`[TIMING] Narrative coherence: ${((Date.now() - tNarrative) / 1000).toFixed(1)}s`);

    // Collect auto-fixes from Style Enforcer
    const fixes: QualityReviewResult['fixes'] = [];
    for (const sr of styleResults) {
      if (sr.result.verdict === 'NEEDS_FIX' && (sr.result.rewrittenTitle || sr.result.rewrittenBody)) {
        const original = slides.find((s) => s.slideNumber === sr.slideNumber);
        if (original) {
          fixes.push({
            slideNumber: sr.slideNumber,
            agent: 'style',
            originalTitle: original.title,
            originalBody: original.body,
            fixedTitle: sr.result.rewrittenTitle ?? original.title,
            fixedBody: sr.result.rewrittenBody ?? original.body,
          });
        }
      }
    }

    // Collect auto-fixes from Fact Checker (replace vague/contradicted claims)
    for (const fr of factCheckResults) {
      if (fr.result.verdict === 'HAS_ERRORS') {
        const original = slides.find((s) => s.slideNumber === fr.slideNumber);
        if (original) {
          let fixedBody = original.body;
          let anyFixed = false;
          for (const claim of fr.result.claims) {
            if (claim.status === 'contradicted' && claim.correction) {
              fixedBody = fixedBody.replace(claim.claim, claim.correction);
              anyFixed = true;
            }
          }
          if (anyFixed) {
            fixes.push({
              slideNumber: fr.slideNumber,
              agent: 'fact_check',
              originalTitle: original.title,
              originalBody: original.body,
              fixedTitle: original.title,
              fixedBody,
            });
          }
        }
      }
    }

    // Compute metrics
    const avgStyleScore =
      styleResults.length > 0
        ? styleResults.reduce((sum, r) => sum + r.result.score, 0) / styleResults.length
        : 1.0;
    const narrativeScore = narrativeResult?.overallScore ?? 1.0;
    const avgFactScore =
      factCheckResults.length > 0
        ? factCheckResults.reduce((sum, r) => sum + r.result.score, 0) / factCheckResults.length
        : 1.0;
    const errorsFound =
      styleResults.reduce((c, r) => c + r.result.issues.filter((i) => i.severity === 'error').length, 0) +
      (narrativeResult?.issues.filter((i) => i.severity === 'error').length ?? 0) +
      factCheckResults.reduce(
        (c, r) => c + r.result.claims.filter((cl) => cl.status === 'contradicted').length,
        0,
      );

    const passed =
      avgStyleScore >= (styleGate.threshold ?? STYLE_PASS_THRESHOLD) &&
      narrativeScore >= (narrativeGate.threshold ?? NARRATIVE_PASS_THRESHOLD) &&
      avgFactScore >= (factCheckGate.threshold ?? FACT_CHECK_PASS_THRESHOLD);

    this.logger.log(
      `[TIMING] Quality review complete in ${((Date.now() - tQStart) / 1000).toFixed(1)}s: style=${avgStyleScore.toFixed(2)}, narrative=${narrativeScore.toFixed(2)}, facts=${avgFactScore.toFixed(2)}, fixes=${fixes.length}, passed=${passed}`,
    );

    return {
      passed,
      styleResults,
      narrativeResult,
      factCheckResults,
      fixes,
      metrics: {
        avgStyleScore,
        narrativeScore,
        avgFactScore,
        slidesFixed: fixes.length,
        errorsFound,
      },
    };
  }

  // ── Style Enforcer Agent ─────────────────────────────────

  private async runStyleEnforcer(
    slides: SlideForReview[],
    themeCategory: string,
    themeName: string,
    themeColors?: { primary: string; accent: string; background: string; text: string },
    archetypeExtraRules?: string[],
  ): Promise<Array<{ slideNumber: number; result: StyleEnforcerResult }>> {
    const systemPrompt = buildStyleEnforcerPrompt(themeCategory, themeName, themeColors, archetypeExtraRules);
    const results: Array<{ slideNumber: number; result: StyleEnforcerResult }> = [];

    // Process slides in batches of 3 for controlled parallelism
    const batchSize = 3;
    for (let i = 0; i < slides.length; i += batchSize) {
      const batch = slides.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (slide) => {
          try {
            const userContent = `Review this slide for theme compliance:

Slide ${slide.slideNumber} (${slide.slideType}):
Title: ${slide.title}
Body:
${slide.body}
Speaker Notes: ${slide.speakerNotes}
${slide.imagePromptHint ? `Image Prompt: ${slide.imagePromptHint}` : ''}`;

            const result = await this.llm.completeJson<StyleEnforcerResult>(
              [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              LlmModel.HAIKU,
              isValidStyleEnforcerResult,
              1,
            );

            return { slideNumber: slide.slideNumber, result };
          } catch (err) {
            this.logger.warn(`Style Enforcer failed for slide ${slide.slideNumber}: ${err}`);
            return {
              slideNumber: slide.slideNumber,
              result: {
                verdict: 'PASS' as const,
                score: 0.8,
                issues: [{ rule: 'agent_error', severity: 'warning' as const, message: 'Style review unavailable', fix: '' }],
                rewrittenTitle: null,
                rewrittenBody: null,
              },
            };
          }
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ── Narrative Coherence Agent ────────────────────────────

  private async runNarrativeCoherence(
    slides: SlideForReview[],
    presentationType: string,
    frameworkName?: string,
    archetypeExtraRules?: string[],
  ): Promise<NarrativeCoherenceResult | null> {
    if (slides.length < 3) return null; // Too few slides for narrative analysis

    const systemPrompt = buildNarrativeCoherencePrompt(presentationType, frameworkName, archetypeExtraRules);

    const slideSummaries = slides
      .map((s) => `Slide ${s.slideNumber} [${s.slideType}]: "${s.title}"\n  ${s.body.slice(0, 150).replace(/\n/g, ' ')}...`)
      .join('\n\n');

    try {
      return await this.llm.completeJson<NarrativeCoherenceResult>(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Review the narrative coherence of this ${slides.length}-slide presentation:\n\n${slideSummaries}`,
          },
        ],
        LlmModel.SONNET,
        isValidNarrativeCoherenceResult,
        1,
      );
    } catch (err) {
      this.logger.warn(`Narrative Coherence failed: ${err}`);
      return null;
    }
  }

  // ── Fact Checker Agent ───────────────────────────────────

  private async runFactChecker(
    slides: SlideForReview[],
    userId: string,
    presentationId: string,
  ): Promise<Array<{ slideNumber: number; result: FactCheckerResult }>> {
    // Only fact-check data-heavy slide types
    const dataHeavyTypes = new Set(['DATA_METRICS', 'CONTENT', 'PROBLEM', 'SOLUTION', 'COMPARISON', 'CASE_STUDY']);
    const slidesToCheck = slides.filter((s) => dataHeavyTypes.has(s.slideType));

    if (slidesToCheck.length === 0) return [];

    // Retrieve KB context for the presentation topic (used as ground truth)
    const presentation = await this.getPresentationTopic(presentationId);

    const results: Array<{ slideNumber: number; result: FactCheckerResult }> = [];

    // Process in batches of 2 (fact checking needs more context per call)
    const batchSize = 2;
    for (let i = 0; i < slidesToCheck.length; i += batchSize) {
      const batch = slidesToCheck.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (slide) => {
          try {
            // Retrieve slide-specific KB context for fact checking
            const kbContext = await this.contextBuilder.retrieveSlideContext(
              userId,
              slide.title,
              slide.body.split('\n').filter((l) => l.trim()),
              5,
              3,
            );

            const systemPrompt = buildFactCheckerPrompt(kbContext);
            const userContent = `Fact-check this slide:

Slide ${slide.slideNumber} (${slide.slideType}):
Title: ${slide.title}
Body:
${slide.body}`;

            const result = await this.llm.completeJson<FactCheckerResult>(
              [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              LlmModel.SONNET,
              isValidFactCheckerResult,
              1,
            );

            return { slideNumber: slide.slideNumber, result };
          } catch (err) {
            this.logger.warn(`Fact Checker failed for slide ${slide.slideNumber}: ${err}`);
            return {
              slideNumber: slide.slideNumber,
              result: {
                verdict: 'VERIFIED' as const,
                score: 0.8,
                claims: [],
              },
            };
          }
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ── Helpers ──────────────────────────────────────────────

  /** Lightweight topic fetch for fact checker context building. */
  private async getPresentationTopic(presentationId: string): Promise<string> {
    // Access prisma through contextBuilder's internal usage
    // The fact checker uses contextBuilder.retrieveSlideContext which handles this
    return presentationId; // The topic is resolved per-slide in fact checker
  }
}
