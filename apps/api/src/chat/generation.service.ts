import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { ContentReviewerService } from './content-reviewer.service.js';
import { FeedbackLogService } from './feedback-log.service.js';
import { ValidationGateService } from './validation-gate.service.js';
import { TierEnforcementService } from '../credits/tier-enforcement.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { DECK_GENERATION_COST } from '../credits/tier-config.js';
import { ImagesService } from '../images/images.service.js';
import { NanoBananaService } from '../images/nano-banana.service.js';
import { QualityAgentsService } from './quality-agents.service.js';
import type { SlideForReview } from './quality-agents.service.js';
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from './prompts/outline.prompt.js';
import type { GeneratedOutline, OutlineSlide } from './prompts/outline.prompt.js';
import {
  buildSlideGenerationSystemPrompt,
  buildSlideGenerationUserPrompt,
} from './prompts/slide-generation.prompt.js';
import { DEFAULT_SLIDE_RANGES } from './dto/generation-config.dto.js';
import { getFrameworkConfig } from '../pitch-lens/frameworks/story-frameworks.config.js';
import { buildPitchLensInjection } from '../pitch-lens/prompts/pitch-lens-injection.prompt.js';
import { getImageFrequencyForTheme, getThemeCategoryByName } from '../themes/themes.service.js';
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  CreditReason,
} from '../../generated/prisma/enums.js';
import { DENSITY_LIMITS, type SlideContent } from '../constraints/density-validator.js';
import { TtlMap } from '../common/ttl-map.js';
import type { ChatStreamEvent } from './chat.service.js';
import { isValidOutline, isValidSlideContent } from './validators.js';
import type { GeneratedSlideContent } from './validators.js';

// ── Interfaces ──────────────────────────────────────────────

export interface GenerationConfig {
  topic: string;
  presentationType: string;
  themeId?: string;
  pitchLensId?: string;
  minSlides?: number;
  maxSlides?: number;
  autoGenerateImages?: boolean;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  /** Stores pending outlines keyed by presentationId. 30-min TTL, max 1000 entries. */
  private pendingOutlines = new TtlMap<string, { outline: GeneratedOutline; config: GenerationConfig }>(
    30 * 60 * 1000,
    1000,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly constraints: ConstraintsService,
    private readonly events: EventsGateway,
    private readonly contentReviewer: ContentReviewerService,
    private readonly feedbackLog: FeedbackLogService,
    private readonly validationGate: ValidationGateService,
    private readonly tierEnforcement: TierEnforcementService,
    private readonly credits: CreditsService,
    private readonly imagesService: ImagesService,
    private readonly nanoBanana: NanoBananaService,
    private readonly qualityAgents: QualityAgentsService,
  ) {}

  /**
   * Generate an outline from a topic using RAG context.
   * Streams the outline as markdown to the chat, then stores it
   * as a pending outline awaiting approval.
   */
  async *generateOutline(
    userId: string,
    presentationId: string,
    config: GenerationConfig,
  ): AsyncGenerator<ChatStreamEvent> {
    const presType = config.presentationType || 'STANDARD';
    const range = {
      min: config.minSlides ?? DEFAULT_SLIDE_RANGES[presType]?.min ?? 8,
      max: config.maxSlides ?? DEFAULT_SLIDE_RANGES[presType]?.max ?? 16,
    };

    // 0. Fetch Pitch Lens + Brief context (if presentation is linked)
    let pitchLensContext: string | undefined;
    const presWithContext = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { pitchLens: true, brief: true },
    });

    // Guard: Pitch Lens is required for deck generation
    if (!presWithContext?.pitchLens) {
      yield { type: 'error', content: 'A Pitch Lens is required to generate a deck. Create one in the Cockpit or during onboarding.' };
      return;
    }
    if (presWithContext?.pitchLens) {
      const framework = getFrameworkConfig(presWithContext.pitchLens.selectedFramework);
      pitchLensContext = buildPitchLensInjection({ ...presWithContext.pitchLens, framework });
      // Use framework's ideal slide range if user didn't specify custom range
      if (!config.minSlides && !config.maxSlides && framework) {
        range.min = framework.idealSlideRange.min;
        range.max = framework.idealSlideRange.max;
      }
    }

    // 1. RAG retrieval: KB (pgvector) + Omnisearch (vault) enrichment
    yield { type: 'thinking', content: 'Planning your presentation...' };
    yield { type: 'progress', content: 'Retrieving relevant content', metadata: { step: 'rag', status: 'running' } };
    const kbContext = presWithContext?.briefId
      ? await this.contextBuilder.retrieveBriefContext(userId, presWithContext.briefId, config.topic, 8)
      : await this.contextBuilder.retrieveEnrichedContext(userId, config.topic, 5, 5);
    yield { type: 'progress', content: 'Retrieving relevant content', metadata: { step: 'rag', status: 'complete' } };

    // 2. Generate outline via LLM (JSON mode)
    const systemPrompt = buildOutlineSystemPrompt(presType, range, kbContext, pitchLensContext);
    const userPrompt = buildOutlineUserPrompt(config.topic);

    yield { type: 'progress', content: 'Generating outline structure', metadata: { step: 'outline_llm', status: 'running' } };

    let outline: GeneratedOutline;
    try {
      outline = await this.llm.completeJson<GeneratedOutline>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.OPUS,
        isValidOutline,
        2,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Outline generation failed: ${msg}`);
      yield { type: 'error', content: `Failed to generate outline: ${msg}` };
      return;
    }
    yield { type: 'progress', content: 'Generating outline structure', metadata: { step: 'outline_llm', status: 'complete' } };

    // Validate outline has slides
    if (!outline.slides || outline.slides.length === 0) {
      yield { type: 'error', content: 'Generated outline was empty. Please try again with more detail.' };
      return;
    }

    // 3. Store pending outline
    this.pendingOutlines.set(presentationId, { outline, config });

    // 4. Stream outline as readable markdown
    yield { type: 'token', content: `## ${outline.title}\n\n` };

    for (const slide of outline.slides) {
      yield {
        type: 'token',
        content: `**Slide ${slide.slideNumber}: ${slide.title}** _(${slide.slideType})_\n`,
      };
      for (const bullet of slide.bulletPoints) {
        yield { type: 'token', content: `- ${bullet}\n` };
      }
      yield { type: 'token', content: '\n' };
    }

    yield {
      type: 'token',
      content: `---\n_${outline.slides.length} slides. Type **approve** to generate the full deck, or tell me what to change._\n`,
    };

    // 5. Persist as assistant message with messageType 'outline'
    const outlineMarkdown = this.outlineToMarkdown(outline);
    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'assistant',
        content: outlineMarkdown,
        messageType: 'outline',
        metadata: JSON.parse(JSON.stringify(outline)),
      },
    });

    yield { type: 'done', content: '' };
  }

  /**
   * Check if a message is an approval of a pending outline.
   */
  isApproval(content: string): boolean {
    const normalized = content.trim().toLowerCase();
    const approvalPhrases = [
      'approve', 'approved', 'yes', 'go ahead', 'looks good',
      'generate', 'do it', 'ok', 'okay', 'perfect', 'let\'s go',
      'ship it', 'proceed', 'confirm', 'build it', 'create it',
    ];
    return approvalPhrases.some((phrase) => normalized === phrase || normalized.startsWith(phrase));
  }

  /**
   * Check if there's a pending outline for a presentation.
   */
  hasPendingOutline(presentationId: string): boolean {
    return this.pendingOutlines.has(presentationId);
  }

  /**
   * Execute the approved outline: create the presentation and generate
   * slides one-by-one with streaming progress.
   */
  async *executeOutline(
    userId: string,
    presentationId: string,
  ): AsyncGenerator<ChatStreamEvent> {
    const pending = this.pendingOutlines.get(presentationId);
    if (!pending) {
      yield { type: 'error', content: 'No pending outline to approve. Use /outline or ask me to create a deck.' };
      return;
    }

    const { outline, config } = pending;
    this.pendingOutlines.delete(presentationId);

    // Tier enforcement: check monthly deck limit
    const deckCheck = await this.tierEnforcement.canCreateDeck(userId);
    if (!deckCheck.allowed) {
      yield { type: 'error', content: deckCheck.reason ?? 'Monthly deck limit reached. Upgrade your plan for more.' };
      return;
    }

    // Credit check: deck generation costs credits (covers LLM costs)
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
    if ((user?.creditBalance ?? 0) < DECK_GENERATION_COST) {
      yield { type: 'error', content: `Not enough credits. Deck generation costs ${DECK_GENERATION_COST} credits. You have ${user?.creditBalance ?? 0}. Upgrade your plan or purchase credits.` };
      return;
    }

    yield { type: 'thinking', content: 'Preparing to generate your deck...' };

    // 1. Parallel setup: resolve theme, get briefId, build feedback block
    yield { type: 'progress', content: 'Resolving theme', metadata: { step: 'theme', status: 'running' } };
    const [themeId, presForBrief, feedbackBlock] = await Promise.all([
      this.resolveThemeId(config.themeId),
      this.prisma.presentation.findUnique({
        where: { id: presentationId },
        select: { briefId: true },
      }),
      this.contextBuilder.buildFeedbackBlock(userId),
    ]);
    const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
    const themeName = theme?.displayName ?? 'Pitchable Dark';
    const themeColors = theme?.colorPalette
      ? { ...(theme.colorPalette as { primary: string; secondary: string; accent: string; background: string; text: string }), headingFont: theme.headingFont, bodyFont: theme.bodyFont }
      : undefined;
    yield { type: 'progress', content: 'Resolving theme', metadata: { step: 'theme', status: 'complete' } };

    // 2. Parallel: KB context + Pitch Lens fetch
    yield { type: 'progress', content: 'Building knowledge context', metadata: { step: 'kb_context', status: 'running' } };
    const [kbContext, presWithLens] = await Promise.all([
      presForBrief?.briefId
        ? this.contextBuilder.retrieveBriefContext(userId, presForBrief.briefId, config.topic, 8)
        : this.contextBuilder.retrieveEnrichedContext(userId, config.topic, 5, 5),
      this.prisma.presentation.findUnique({
        where: { id: presentationId },
        include: { pitchLens: true },
      }),
    ]);
    yield { type: 'progress', content: 'Building knowledge context', metadata: { step: 'kb_context', status: 'complete' } };

    // 3. Update presentation metadata
    const presType = config.presentationType as PresentationType ?? PresentationType.STANDARD;
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: {
        title: outline.title,
        sourceContent: config.topic,
        presentationType: presType,
        status: PresentationStatus.PROCESSING,
        themeId,
      },
    });

    // 4. Delete existing slides (in case of regeneration)
    await this.prisma.slide.deleteMany({ where: { presentationId } });

    // 4b. Build Pitch Lens context for slide generation
    let pitchLensContext: string | undefined;
    if (presWithLens?.pitchLens) {
      const framework = getFrameworkConfig(presWithLens.pitchLens.selectedFramework);
      pitchLensContext = buildPitchLensInjection({ ...presWithLens.pitchLens, framework });
    }

    // 4c. Extract density + image layout from Pitch Lens
    const densityOverrides = presWithLens?.pitchLens ? {
      maxBullets: presWithLens.pitchLens.maxBulletsPerSlide ?? undefined,
      maxWords: presWithLens.pitchLens.maxWordsPerSlide ?? undefined,
      maxTableRows: presWithLens.pitchLens.maxTableRows ?? undefined,
    } : undefined;
    const imageLayoutInstruction = presWithLens?.pitchLens?.imageLayout === 'BACKGROUND'
      ? 'Place images as full-slide backgrounds at 15% opacity. Do not use side-panel images.'
      : undefined;

    // 5. Build slide system prompt with user feedback injection
    // PitchLens imageFrequency overrides theme default when set
    let imageFreqInstruction: string | undefined;
    if (presWithLens?.pitchLens?.imageFrequency && presWithLens.pitchLens.imageFrequency > 0) {
      const freq = presWithLens.pitchLens.imageFrequency;
      if (freq === 1) {
        imageFreqInstruction = 'MANDATORY: Generate a non-empty imagePromptHint for EVERY slide. Every single slide MUST have an image. Never set imagePromptHint to empty string.';
      } else if (freq <= 2) {
        imageFreqInstruction = `MANDATORY: Generate a non-empty imagePromptHint for at least every other slide. At minimum 50% of slides MUST have a non-empty imagePromptHint. Do NOT set all to empty string — the client explicitly requested frequent images.`;
      } else if (freq <= 4) {
        imageFreqInstruction = `Generate imagePromptHint for ~1 in ${freq} slides. Prefer data visualizations, product screenshots, and hero images.`;
      } else {
        imageFreqInstruction = `Generate imagePromptHint for ~1 in ${freq} slides. Set to empty string "" for the rest.`;
      }
    } else {
      imageFreqInstruction = theme ? getImageFrequencyForTheme(theme.name) : undefined;
    }
    const slideSystemPrompt = buildSlideGenerationSystemPrompt(
      config.presentationType,
      themeName,
      kbContext,
      pitchLensContext,
      themeColors,
      imageFreqInstruction,
      densityOverrides,
      imageLayoutInstruction,
    ) + feedbackBlock;

    // Track offset when NEEDS_SPLIT inserts extra slides
    let slideNumberOffset = 0;
    const generatedSlides: Array<{ title: string; body: string }> = [];
    // Split budget: cap total slides at maxSlides (or outline.slides.length + 25% headroom)
    const maxTotalSlides = Math.min(
      config.maxSlides ?? DEFAULT_SLIDE_RANGES[config.presentationType || 'STANDARD']?.max ?? 16,
      Math.ceil(outline.slides.length * 1.25),
    );

    // Pre-fetch all per-slide KB contexts in parallel (zero risk to narrative coherence)
    const dataHeavyTypes = ['DATA_METRICS', 'CONTENT', 'PROBLEM', 'SOLUTION', 'COMPARISON'];
    const slideKbContexts = await Promise.all(
      outline.slides.map((slide) =>
        dataHeavyTypes.includes(slide.slideType)
          ? this.contextBuilder.retrieveSlideContext(userId, slide.title, slide.bulletPoints, 2, 2)
          : Promise.resolve('')
      ),
    );

    for (const [slideIndex, outlineSlide] of outline.slides.entries()) {
      const actualSlideNumber = outlineSlide.slideNumber + slideNumberOffset;

      yield {
        type: 'progress',
        content: `Generating slide ${outlineSlide.slideNumber}/${outline.slides.length}: ${outlineSlide.title}`,
        metadata: {
          step: 'generate_slide',
          status: 'running',
          current: outlineSlide.slideNumber,
          total: outline.slides.length,
          label: outlineSlide.title,
        },
      };

      // Emit progress via WebSocket
      this.events.emitGenerationProgress({
        presentationId,
        step: `slide-${outlineSlide.slideNumber}`,
        progress: outlineSlide.slideNumber / outline.slides.length,
        message: `Generating slide ${outlineSlide.slideNumber}/${outline.slides.length}: ${outlineSlide.title}`,
      });

      // Use pre-fetched per-slide KB context
      const slideKbContext = slideKbContexts[slideIndex];

      const slideContent = await this.generateSlideContent(
        slideSystemPrompt,
        outlineSlide,
        generatedSlides,
        slideKbContext,
      );

      // Validate density and auto-fix
      const validated = this.validateSlideContent(slideContent, outlineSlide, themeColors);

      // Save to DB
      const slide = await this.prisma.slide.create({
        data: {
          presentationId,
          slideNumber: actualSlideNumber,
          title: validated.title,
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          slideType: outlineSlide.slideType as SlideType,
          imagePrompt: validated.imagePromptHint,
        },
      });

      // Emit slide update via WebSocket
      this.events.emitSlideAdded({
        presentationId,
        slide: {
          id: slide.id,
          slideNumber: slide.slideNumber,
          title: slide.title,
          body: slide.body,
          speakerNotes: slide.speakerNotes,
          slideType: slide.slideType,
          imageUrl: null,
          imagePrompt: slide.imagePrompt,
        },
        position: actualSlideNumber,
      });

      // Track for prior-slides context (Recommendation #5)
      generatedSlides.push({ title: validated.title, body: validated.body });

      // Run content reviewer (pipelined: await previous review, fire this one async)
      let reviewPassed = true;
      try {
        const customLimits = densityOverrides ? {
          ...DENSITY_LIMITS,
          ...(densityOverrides.maxBullets != null && { maxBulletsPerSlide: densityOverrides.maxBullets }),
          ...(densityOverrides.maxWords != null && { maxWordsPerSlide: densityOverrides.maxWords }),
          ...(densityOverrides.maxTableRows != null && { maxTableRows: densityOverrides.maxTableRows }),
        } : undefined;
        // Await review synchronously since NEEDS_SPLIT affects slideNumberOffset for next slide
        const review = await this.contentReviewer.reviewSlide({
          title: validated.title,
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          slideType: outlineSlide.slideType,
        }, customLimits);

        reviewPassed = review.verdict === 'PASS';

        if (review.issues.length > 0) {
          for (const issue of review.issues) {
            const category = issue.rule === 'density' ? 'density' as const
              : issue.rule === 'concept' ? 'concept' as const
              : issue.rule === 'clarity' ? 'style' as const
              : 'style' as const;
            this.feedbackLog.logViolation(
              userId,
              presentationId,
              slide.id,
              category,
              issue.message,
            ).catch(() => {});
          }
        }

        // Handle NEEDS_SPLIT: insert additional split slides (with budget guard)
        const currentTotal = outline.slides.length + slideNumberOffset;
        const splitCount = review.suggestedSplits?.length ?? 0;
        const splitBudgetExhausted = currentTotal + splitCount - 1 > maxTotalSlides;
        // Cap splits at 2 parts max (even if reviewer suggests more)
        const cappedSplits = review.suggestedSplits?.slice(0, 2);

        if (
          review.verdict === 'NEEDS_SPLIT'
          && cappedSplits
          && cappedSplits.length > 1
          && !splitBudgetExhausted
        ) {
          this.logger.log(
            `Slide ${actualSlideNumber} split into ${cappedSplits.length} slides (budget: ${currentTotal + cappedSplits.length - 1}/${maxTotalSlides})`,
          );

          // Update the original slide with the first split's content
          const firstSplit = cappedSplits[0];
          await this.prisma.slide.update({
            where: { id: slide.id },
            data: {
              title: firstSplit.title,
              body: firstSplit.body,
            },
          });

          this.events.emitSlideUpdated({
            presentationId,
            slideId: slide.id,
            data: { title: firstSplit.title, body: firstSplit.body },
          });

          generatedSlides[generatedSlides.length - 1] = {
            title: firstSplit.title,
            body: firstSplit.body,
          };

          // Insert remaining splits as new slides (max 1 additional)
          for (let si = 1; si < cappedSplits.length; si++) {
            slideNumberOffset++;
            const splitNum = actualSlideNumber + si;
            const splitData = cappedSplits[si];

            const splitSlide = await this.prisma.slide.create({
              data: {
                presentationId,
                slideNumber: splitNum,
                title: splitData.title,
                body: splitData.body,
                speakerNotes: validated.speakerNotes,
                slideType: outlineSlide.slideType as SlideType,
                imagePrompt: validated.imagePromptHint,
              },
            });

            this.events.emitSlideAdded({
              presentationId,
              slide: {
                id: splitSlide.id,
                slideNumber: splitSlide.slideNumber,
                title: splitSlide.title,
                body: splitSlide.body,
                speakerNotes: splitSlide.speakerNotes,
                slideType: splitSlide.slideType,
                imageUrl: null,
                imagePrompt: splitSlide.imagePrompt,
              },
              position: splitNum,
            });

            generatedSlides.push({ title: splitData.title, body: splitData.body });

            yield {
              type: 'token',
              content: `  Auto-split: created slide ${splitNum} — "${splitData.title}"\n`,
            };
          }
        } else if (review.verdict === 'NEEDS_SPLIT' && splitBudgetExhausted) {
          this.logger.log(
            `Slide ${actualSlideNumber} split skipped — budget exhausted (${currentTotal}/${maxTotalSlides})`,
          );
        }
      } catch (reviewErr) {
        // Content review failed — log and continue with original content (blocking behavior
        // is handled by the service itself; if it throws, we still proceed with the slide)
        this.logger.warn(`Content review error for slide ${actualSlideNumber}: ${reviewErr}`);
      }

      // Queue for validation gate (non-blocking: if auto-approved, skip)
      const needsValidation = this.validationGate.queueValidation({
        presentationId,
        slideId: slide.id,
        slideNumber: actualSlideNumber,
        title: validated.title,
        body: validated.body,
        speakerNotes: validated.speakerNotes,
        slideType: outlineSlide.slideType,
        reviewPassed,
      });

      if (needsValidation) {
        // Emit validation request to chat stream
        yield {
          type: 'action',
          content: '',
          metadata: {
            action: 'validation_request',
            slideId: slide.id,
            slideNumber: actualSlideNumber,
            title: validated.title,
            body: validated.body,
            speakerNotes: validated.speakerNotes,
            slideType: outlineSlide.slideType,
            reviewPassed,
          },
        };
      }

      // Mark slide as complete in progress
      yield {
        type: 'progress',
        content: `Generating slide ${outlineSlide.slideNumber}/${outline.slides.length}: ${outlineSlide.title}`,
        metadata: {
          step: 'generate_slide',
          status: 'complete',
          current: outlineSlide.slideNumber,
          total: outline.slides.length,
          label: outlineSlide.title,
        },
      };
    }

    // 6. Multi-Agent Quality Review (Style + Narrative + Fact Check — all Opus 4.6)
    yield { type: 'progress', content: 'Running quality review agents', metadata: { step: 'quality_review', status: 'running' } };

    const allSlides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
      select: { id: true, slideNumber: true, title: true, body: true, speakerNotes: true, slideType: true, imagePrompt: true },
    });

    const slidesForReview: SlideForReview[] = allSlides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.title,
      body: s.body,
      speakerNotes: s.speakerNotes ?? '',
      slideType: s.slideType,
      imagePromptHint: s.imagePrompt ?? undefined,
    }));

    // Determine theme category for style rules (from in-memory BUILT_IN_THEMES)
    const themeCategory = getThemeCategoryByName(theme?.name ?? '');

    try {
      const qualityResult = await this.qualityAgents.reviewPresentation(slidesForReview, {
        themeCategory,
        themeName,
        themeColors,
        presentationType: config.presentationType || 'STANDARD',
        frameworkName: presWithLens?.pitchLens?.selectedFramework ?? undefined,
        userId,
        presentationId,
      });

      yield { type: 'progress', content: 'Running quality review agents', metadata: { step: 'quality_review', status: 'complete' } };

      // Apply auto-fixes from agents
      if (qualityResult.fixes.length > 0) {
        yield { type: 'token', content: `\n**Quality Review:** Auto-fixing ${qualityResult.fixes.length} slides...\n` };
        for (const fix of qualityResult.fixes) {
          const slideToFix = allSlides.find((s) => s.slideNumber === fix.slideNumber);
          if (slideToFix) {
            await this.prisma.slide.update({
              where: { id: slideToFix.id },
              data: { title: fix.fixedTitle, body: fix.fixedBody },
            });
            this.events.emitSlideUpdated({
              presentationId,
              slideId: slideToFix.id,
              data: { title: fix.fixedTitle, body: fix.fixedBody },
            });
            yield { type: 'token', content: `  Fixed slide ${fix.slideNumber} (${fix.agent}): "${fix.fixedTitle}"\n` };
          }
        }
      }

      // Report quality metrics
      const m = qualityResult.metrics;
      yield {
        type: 'token',
        content: `\n**Quality Scores:** Style: ${(m.avgStyleScore * 100).toFixed(0)}% | Narrative: ${(m.narrativeScore * 100).toFixed(0)}% | Facts: ${(m.avgFactScore * 100).toFixed(0)}%${m.errorsFound > 0 ? ` | Errors fixed: ${m.errorsFound}` : ''}\n`,
      };

      // Report narrative issues (if any)
      if (qualityResult.narrativeResult?.issues.length) {
        const errors = qualityResult.narrativeResult.issues.filter((i) => i.severity === 'error');
        if (errors.length > 0) {
          yield { type: 'token', content: `\n**Narrative Issues:**\n` };
          for (const issue of errors) {
            yield { type: 'token', content: `- Slides ${issue.slideNumbers.join(',')}: ${issue.message}\n` };
          }
        }
      }
    } catch (qualityErr) {
      this.logger.warn(`Quality review pipeline failed (non-fatal): ${qualityErr}`);
      yield { type: 'progress', content: 'Quality review skipped', metadata: { step: 'quality_review', status: 'complete' } };
    }

    // 7. Mark presentation as completed and increment deck count
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { status: PresentationStatus.COMPLETED },
    });

    await this.tierEnforcement.incrementDeckCount(userId);

    // Deduct deck generation credits (covers Opus 4.6 LLM costs)
    await this.credits.deductCredits(userId, DECK_GENERATION_COST, CreditReason.DECK_GENERATION, presentationId);

    const totalSlides = outline.slides.length + slideNumberOffset;
    yield {
      type: 'token',
      content: `\n**Done!** Generated ${totalSlides} slides for "${outline.title}"${slideNumberOffset > 0 ? ` (${slideNumberOffset} auto-split)` : ''}. You can now:\n- Click any slide to edit inline\n- Ask me to modify specific slides ("make slide 3 more concise")\n- Use /theme to change the visual style\n- Use /export to download\n`,
    };

    // 8. Auto-generate images (non-blocking) if configured
    const shouldGenerateImages = config.autoGenerateImages !== false && this.nanoBanana.isConfigured;
    if (shouldGenerateImages) {
      try {
        const imageJobs = await this.imagesService.queueBatchGeneration(presentationId, userId);
        if (imageJobs.length > 0) {
          yield {
            type: 'token',
            content: `\nGenerating **${imageJobs.length} images** in the background... Your slides will update as images complete.\n`,
          };
        }
      } catch (imgErr) {
        this.logger.warn(`Auto image generation failed: ${imgErr instanceof Error ? imgErr.message : 'unknown'}`);
      }
    }

    // Persist assistant message
    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'assistant',
        content: `Generated ${totalSlides} slides for "${outline.title}".`,
        messageType: 'text',
      },
    });

    yield { type: 'done', content: '' };
  }

  /**
   * Rewrite all existing slides in-place using the current Brief + Lens context.
   * Preserves the slide structure (titles, order, types) but regenerates body content.
   */
  async *rewriteSlides(
    userId: string,
    presentationId: string,
  ): AsyncGenerator<ChatStreamEvent> {
    // Load presentation with slides, brief, and lens
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        slides: { orderBy: { slideNumber: 'asc' } },
        pitchLens: true,
        brief: true,
        theme: true,
      },
    });

    if (!presentation) {
      yield { type: 'error', content: 'Presentation not found.' };
      return;
    }

    if (presentation.userId !== userId) {
      yield { type: 'error', content: 'Access denied.' };
      return;
    }

    if (presentation.slides.length === 0) {
      yield { type: 'error', content: 'No slides to rewrite. Generate a deck first.' };
      return;
    }

    // Credit check
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
    if ((user?.creditBalance ?? 0) < DECK_GENERATION_COST) {
      yield { type: 'error', content: `Not enough credits. Rewrite costs ${DECK_GENERATION_COST} credits. You have ${user?.creditBalance ?? 0}.` };
      return;
    }

    yield { type: 'token', content: `Rewriting **${presentation.slides.length} slides** with current Brief/Lens context...\n\n` };

    // Mark as processing
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { status: PresentationStatus.PROCESSING },
    });

    // Build context: KB + Omnisearch vault enrichment
    const kbContext = presentation.briefId
      ? await this.contextBuilder.retrieveBriefContext(userId, presentation.briefId, presentation.title, 8)
      : await this.contextBuilder.retrieveEnrichedContext(userId, presentation.title, 5, 5);

    let pitchLensContext: string | undefined;
    if (presentation.pitchLens) {
      const framework = getFrameworkConfig(presentation.pitchLens.selectedFramework);
      pitchLensContext = buildPitchLensInjection({ ...presentation.pitchLens, framework });
    }

    // Extract density + image layout from Pitch Lens (rewrite path)
    const rewriteDensity = presentation.pitchLens ? {
      maxBullets: presentation.pitchLens.maxBulletsPerSlide ?? undefined,
      maxWords: presentation.pitchLens.maxWordsPerSlide ?? undefined,
    } : undefined;
    const rewriteImageLayout = presentation.pitchLens?.imageLayout === 'BACKGROUND'
      ? 'Place images as full-slide backgrounds at 15% opacity. Do not use side-panel images.'
      : undefined;

    const themeName = presentation.theme?.displayName ?? 'Pitchable Dark';
    const rewriteThemeColors = presentation.theme?.colorPalette
      ? { ...(presentation.theme.colorPalette as { primary: string; secondary: string; accent: string; background: string; text: string }), headingFont: presentation.theme.headingFont, bodyFont: presentation.theme.bodyFont }
      : undefined;
    const feedbackBlock = await this.contextBuilder.buildFeedbackBlock(userId);
    const rewriteImgFreq = presentation.theme ? getImageFrequencyForTheme(presentation.theme.name) : undefined;
    const slideSystemPrompt = buildSlideGenerationSystemPrompt(
      presentation.presentationType,
      themeName,
      kbContext,
      pitchLensContext,
      rewriteThemeColors,
      rewriteImgFreq,
      rewriteDensity,
      rewriteImageLayout,
    ) + feedbackBlock;

    const priorSlides: Array<{ title: string; body: string }> = [];

    for (const slide of presentation.slides) {
      yield {
        type: 'token',
        content: `Rewriting slide ${slide.slideNumber}: **${slide.title}**... `,
      };

      // Build an OutlineSlide-like object from the existing slide
      const outlineSlide: OutlineSlide = {
        slideNumber: slide.slideNumber,
        title: slide.title,
        bulletPoints: slide.body.split('\n').filter((l) => l.trim()),
        slideType: slide.slideType,
      };

      const raw = await this.generateSlideContent(slideSystemPrompt, outlineSlide, priorSlides);
      const validated = this.validateSlideContent(raw, outlineSlide, rewriteThemeColors);

      // Update slide in-place
      await this.prisma.slide.update({
        where: { id: slide.id },
        data: {
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          imagePrompt: validated.imagePromptHint,
        },
      });

      this.events.emitSlideUpdated({
        presentationId,
        slideId: slide.id,
        data: {
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          imagePrompt: validated.imagePromptHint,
        },
      });

      priorSlides.push({ title: validated.title, body: validated.body });

      yield { type: 'token', content: 'done\n' };
    }

    // Mark as completed
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { status: PresentationStatus.COMPLETED },
    });

    // Deduct credits
    await this.credits.deductCredits(userId, DECK_GENERATION_COST, CreditReason.DECK_GENERATION, presentationId);

    // Clear all existing images so batch generation regenerates them
    await this.prisma.slide.updateMany({
      where: { presentationId },
      data: { imageUrl: null },
    });

    // Queue batch image generation if configured
    if (this.nanoBanana.isConfigured) {
      try {
        const imageJobs = await this.imagesService.queueBatchGeneration(presentationId, userId);
        if (imageJobs.length > 0) {
          yield {
            type: 'token',
            content: `\n**Rewrite complete!** All ${presentation.slides.length} slides updated. Generating **${imageJobs.length} images** in the background...\n`,
          };
        } else {
          yield {
            type: 'token',
            content: `\n**Rewrite complete!** All ${presentation.slides.length} slides have been updated with the current Brief/Lens context.\n`,
          };
        }
      } catch (imgErr) {
        this.logger.warn(`Image generation after rewrite failed: ${imgErr instanceof Error ? imgErr.message : 'unknown'}`);
        yield {
          type: 'token',
          content: `\n**Rewrite complete!** All ${presentation.slides.length} slides updated. Image generation skipped.\n`,
        };
      }
    } else {
      yield {
        type: 'token',
        content: `\n**Rewrite complete!** All ${presentation.slides.length} slides have been updated with the current Brief/Lens context.\n`,
      };
    }

    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'assistant',
        content: `Rewrote ${presentation.slides.length} slides with updated Brief/Lens context.`,
        messageType: 'text',
      },
    });

    yield { type: 'done', content: '' };
  }

  // ── Private Helpers ───────────────────────────────────────

  private async generateSlideContent(
    systemPrompt: string,
    outlineSlide: OutlineSlide,
    priorSlides: Array<{ title: string; body: string }> = [],
    slideKbContext = '',
  ): Promise<GeneratedSlideContent> {
    let userPrompt = buildSlideGenerationUserPrompt(
      outlineSlide.slideNumber,
      outlineSlide.title,
      outlineSlide.bulletPoints,
      outlineSlide.slideType,
      priorSlides,
    );

    // Inject per-slide KB context for data-heavy slides
    if (slideKbContext) {
      userPrompt += `\n\nADDITIONAL EVIDENCE FOR THIS SLIDE (use specific data points from this context):\n${slideKbContext}`;
    }

    try {
      return await this.llm.completeJson<GeneratedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.OPUS,
        isValidSlideContent,
        2,
      );
    } catch {
      // Fallback: use outline data directly
      return {
        title: outlineSlide.title,
        body: outlineSlide.bulletPoints.map((b) => `- ${b}`).join('\n'),
        speakerNotes: `Key topic: ${outlineSlide.title}.`,
        imagePromptHint: `Professional slide about ${outlineSlide.title}`,
      };
    }
  }

  private validateSlideContent(
    content: GeneratedSlideContent,
    outlineSlide: OutlineSlide,
    themeColors?: { primary: string; secondary: string; accent: string; background: string; text: string; headingFont?: string; bodyFont?: string },
  ): GeneratedSlideContent {
    const slideContent: SlideContent = {
      title: content.title || outlineSlide.title,
      body: content.body || outlineSlide.bulletPoints.map((b) => `- ${b}`).join('\n'),
    };

    const densityResult = this.constraints.validateDensity(slideContent);

    if (!densityResult.valid) {
      // Auto-fix: truncate body to fit constraints
      const fixResult = this.constraints.autoFixSlide(slideContent, {
        palette: {
          primary: themeColors?.primary ?? '#f97316',
          secondary: themeColors?.secondary ?? '#a1a1a1',
          accent: themeColors?.accent ?? '#fbbf24',
          background: themeColors?.background ?? '#1c1c1c',
          text: themeColors?.text ?? '#fcfbf8',
        },
        headingFont: themeColors?.headingFont ?? 'Montserrat',
        bodyFont: themeColors?.bodyFont ?? 'Inter',
      });

      if (fixResult.fixed && fixResult.slides.length > 0) {
        // Use the first fixed slide (splitting handled at a higher level later)
        return {
          title: fixResult.slides[0].title,
          body: fixResult.slides[0].body,
          speakerNotes: content.speakerNotes || `Key topic: ${outlineSlide.title}.`,
          imagePromptHint: content.imagePromptHint || `Professional slide about ${outlineSlide.title}`,
        };
      }
    }

    return {
      title: content.title || outlineSlide.title,
      body: content.body || outlineSlide.bulletPoints.map((b) => `- ${b}`).join('\n'),
      speakerNotes: content.speakerNotes || `Key topic: ${outlineSlide.title}.`,
      imagePromptHint: content.imagePromptHint || `Professional slide about ${outlineSlide.title}`,
    };
  }

  private outlineToMarkdown(outline: GeneratedOutline): string {
    const parts = [`## ${outline.title}\n`];
    for (const slide of outline.slides) {
      parts.push(`**Slide ${slide.slideNumber}: ${slide.title}** _(${slide.slideType})_`);
      for (const bullet of slide.bulletPoints) {
        parts.push(`- ${bullet}`);
      }
      parts.push('');
    }
    parts.push(`---\n_${outline.slides.length} slides. Type **approve** to generate the full deck, or tell me what to change._`);
    return parts.join('\n');
  }

  private async resolveThemeId(themeId?: string): Promise<string> {
    if (themeId) {
      const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
      if (theme) return theme.id;
    }

    const defaultTheme = await this.prisma.theme.findUnique({
      where: { name: 'pitchable-dark' },
    });
    if (defaultTheme) return defaultTheme.id;

    const anyTheme = await this.prisma.theme.findFirst({
      where: { isBuiltIn: true },
    });
    return anyTheme?.id ?? '';
  }
}
