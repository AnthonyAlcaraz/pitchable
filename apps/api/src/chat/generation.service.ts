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
import { CreditReservationService } from '../credits/credit-reservation.service.js';
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
import { ThemesService, getImageFrequencyForTheme, getThemeCategoryByName } from '../themes/themes.service.js';
import { InteractionGateService } from './interaction-gate.service.js';
import { ArchetypeResolverService } from '../pitch-lens/archetypes/archetype-resolver.service.js';
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  CreditReason,
} from '../../generated/prisma/enums.js';
import type { DeckArchetype } from '../../generated/prisma/enums.js';
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
    private readonly creditReservation: CreditReservationService,
    private readonly imagesService: ImagesService,
    private readonly nanoBanana: NanoBananaService,
    private readonly qualityAgents: QualityAgentsService,
    private readonly archetypeResolver: ArchetypeResolverService,
    private readonly themesService: ThemesService,
    private readonly interactionGate: InteractionGateService,
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
    let chatFrameworkSlideStructure: string[] | undefined;
    if (presWithContext?.pitchLens) {
      const framework = getFrameworkConfig(presWithContext.pitchLens.selectedFramework);
      pitchLensContext = buildPitchLensInjection({ ...presWithContext.pitchLens, framework });
      chatFrameworkSlideStructure = framework?.slideStructure;
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

    // 1b. Build archetype context (if set on Pitch Lens)
    const archetypeContext = presWithContext?.pitchLens?.deckArchetype
      ? this.archetypeResolver.buildArchetypeInjection(presWithContext.pitchLens.deckArchetype as DeckArchetype)
      : undefined;

    // 2. Generate outline via LLM (JSON mode)
    const systemPrompt = buildOutlineSystemPrompt(presType, range, kbContext, pitchLensContext, archetypeContext);
    const userPrompt = buildOutlineUserPrompt(config.topic, chatFrameworkSlideStructure);

    yield { type: 'progress', content: 'Generating outline structure', metadata: { step: 'outline_llm', status: 'running' } };

    let outline: GeneratedOutline;
    try {
      outline = await this.llm.completeJson<GeneratedOutline>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.SONNET,
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

    // Reserve credits upfront to prevent race conditions with concurrent requests
    let reservationId: string | undefined;
    try {
      const reservation = await this.creditReservation.reserve(userId, DECK_GENERATION_COST, CreditReason.DECK_GENERATION, presentationId);
      reservationId = reservation.reservationId;
    } catch {
      const balance = await this.credits.getBalance(userId).catch(() => 0);
      yield { type: 'error', content: `Not enough credits. Deck generation costs ${DECK_GENERATION_COST} credits. You have ${balance}. Upgrade your plan or purchase credits.` };
      return;
    }

    // Tier-based slide truncation: FREE tier gets sample preview only
    const userForTier = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
    const userTier = userForTier?.tier ?? 'FREE';
    const maxSlides = this.tierEnforcement.getMaxSlidesPerDeck(userTier);
    const originalSlideCount = outline.slides.length;
    let isSamplePreview = false;

    try {
    if (maxSlides !== null && outline.slides.length > maxSlides) {
      outline.slides = outline.slides.slice(0, maxSlides);
      // Renumber truncated slides
      for (let i = 0; i < outline.slides.length; i++) {
        outline.slides[i].slideNumber = i + 1;
      }
      isSamplePreview = true;
      yield {
        type: 'token',
        content: `**Sample Preview:** Generating ${maxSlides} of ${originalSlideCount} slides. Upgrade to unlock the full deck.

`,
      };
    }

    yield { type: 'thinking', content: 'Preparing to generate your deck...' };

    // 1. Parallel setup: resolve theme, get briefId, build feedback block
    yield { type: 'progress', content: 'Resolving theme', metadata: { step: 'theme', status: 'running' } };
    let [themeId, presForBrief, feedbackBlock] = await Promise.all([
      this.resolveThemeId(config.themeId),
      this.prisma.presentation.findUnique({
        where: { id: presentationId },
        select: { briefId: true },
      }),
      this.contextBuilder.buildFeedbackBlock(userId),
    ]);
    let theme = await this.prisma.theme.findUnique({ where: { id: themeId } });

    // Theme Selection Gate: if user didn't specify a theme, offer interactive choice
    if (!config.themeId) {
      const presType = config.presentationType || 'STANDARD';
      const lens = await this.prisma.presentation.findUnique({
        where: { id: presentationId },
        include: { pitchLens: true },
      });
      const audience = (lens?.pitchLens as unknown as Record<string, unknown> | null)?.targetAudience as string | undefined;
      const goals = (lens?.pitchLens as unknown as Record<string, unknown> | null)?.goals as string[] | undefined;

      const recommended = await this.themesService.recommendThemes(presType, audience, goals, 3);

      if (recommended.length > 0) {
        const contextId = `theme-${presentationId}-${Date.now()}`;
        const timeoutMs = 20_000;

        yield {
          type: 'action',
          content: '',
          metadata: {
            action: 'theme_selection',
            contextId,
            options: recommended,
            defaultThemeId: recommended[0].id,
            timeoutMs,
          },
        };

        const selectedThemeId = await this.interactionGate.waitForResponse<string>(
          presentationId,
          'theme_selection',
          contextId,
          recommended[0].id,
          timeoutMs,
        );

        // Override theme with user selection
        themeId = selectedThemeId;
        theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
      }
    }

    let themeName = theme?.displayName ?? 'Pitchable Dark';
    let themeColors = theme?.colorPalette
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

    // 4c. Build archetype context for slide generation
    const execArchetypeContext = presWithLens?.pitchLens?.deckArchetype
      ? this.archetypeResolver.buildArchetypeInjection(presWithLens.pitchLens.deckArchetype as DeckArchetype)
      : undefined;

    // 4d. Extract density + image layout from Pitch Lens
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
      execArchetypeContext,
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

    // Enforce section labels when PitchLens toggle is on
    const requireLabels = !!(presWithLens?.pitchLens as unknown as Record<string, unknown> | null)?.showSectionLabels;
    if (requireLabels) {
      for (const slide of outline.slides) {
        if (!slide.sectionLabel || slide.sectionLabel.trim() === '') {
          slide.sectionLabel = slide.slideType.replace(/_/g, ' ');
        }
      }
      this.logger.debug('Section labels enforced on all outline slides');
    }

    // Enforce outline slide when PitchLens toggle is on
    const requireOutline = !!(presWithLens?.pitchLens as unknown as Record<string, unknown> | null)?.showOutlineSlide;
    if (requireOutline && !outline.slides.some((s) => s.slideType === 'OUTLINE')) {
      const contentTitles = outline.slides
        .filter((s) => s.slideType !== 'TITLE' && s.slideType !== 'CTA')
        .map((s, i) => `${i + 1}. ${s.title}`)
        .join('\n');
      const outlineSlideObj = {
        slideNumber: 2,
        title: 'Agenda',
        slideType: 'OUTLINE' as const,
        bulletPoints: ['Overview of topics covered in this presentation'],
        body: contentTitles,
        sectionLabel: requireLabels ? 'AGENDA' : undefined,
        speakerNotes: 'This slide provides an overview of the topics we will cover.',
      };
      // Insert at position 1 (after TITLE) and renumber
      outline.slides.splice(1, 0, outlineSlideObj as typeof outline.slides[0]);
      for (let i = 0; i < outline.slides.length; i++) {
        outline.slides[i].slideNumber = i + 1;
      }
      this.logger.debug('Outline slide injected at position 2');
    }

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

      // Layout Selection Gate: offer layout alternatives for eligible slides
      let effectiveSlideType: string = outlineSlide.slideType;
      if (!GenerationService.SKIP_LAYOUT_TYPES.has(outlineSlide.slideType)) {
        const layoutOptions = this.generateLayoutOptions(outlineSlide);
        if (layoutOptions.length > 1) {
          const layoutContextId = `layout-${presentationId}-${outlineSlide.slideNumber}-${Date.now()}`;
          const layoutTimeoutMs = 15_000;

          yield {
            type: 'action',
            content: '',
            metadata: {
              action: 'layout_selection',
              contextId: layoutContextId,
              slideNumber: outlineSlide.slideNumber,
              slideTitle: outlineSlide.title,
              options: layoutOptions,
              defaultLayout: outlineSlide.slideType,
              timeoutMs: layoutTimeoutMs,
            },
          };

          const selectedLayout = await this.interactionGate.waitForResponse<string>(
            presentationId,
            'layout_selection',
            layoutContextId,
            outlineSlide.slideType,
            layoutTimeoutMs,
          );

          effectiveSlideType = selectedLayout;
          if (selectedLayout !== outlineSlide.slideType) {
            this.logger.debug(`Layout changed for slide ${outlineSlide.slideNumber}: ${outlineSlide.slideType} → ${selectedLayout}`);
          }
        }
      }

      // Override outlineSlide type for generation
      const slideForGeneration = { ...outlineSlide, slideType: effectiveSlideType as SlideType };

      // Use pre-fetched per-slide KB context
      const slideKbContext = slideKbContexts[slideIndex];

      const slideContent = await this.generateSlideContent(
        slideSystemPrompt,
        slideForGeneration,
        generatedSlides,
        slideKbContext,
        outline.slides.length,
      );

      // Validate density and auto-fix
      const validated = this.validateSlideContent(slideContent, slideForGeneration, themeColors);

      // Save to DB (use effectiveSlideType)
      const slide = await this.prisma.slide.create({
        data: {
          presentationId,
          slideNumber: actualSlideNumber,
          title: validated.title,
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          slideType: effectiveSlideType as SlideType,
          imagePrompt: validated.imagePromptHint,
          sectionLabel: outlineSlide.sectionLabel ?? null,
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

      // Emit inline slide preview card to chat stream
      yield {
        type: 'action',
        content: '',
        metadata: {
          action: 'slide_preview',
          slide: {
            id: slide.id,
            slideNumber: slide.slideNumber,
            title: slide.title,
            body: slide.body,
            slideType: slide.slideType,
            imageUrl: null,
          },
        },
      };

      // Track for prior-slides context (Recommendation #5)
      generatedSlides.push({ title: validated.title, body: validated.body });

      // Run content reviewer (pipelined: await previous review, fire this one async)
      // VISUAL_HUMOR slides are intentionally minimal — skip density review
      const skipReview = outlineSlide.slideType === 'VISUAL_HUMOR' || outlineSlide.slideType === 'SECTION_DIVIDER';
      let reviewPassed = true;
      if (skipReview) {
        this.logger.debug(`Skipping content review for VISUAL_HUMOR slide ${actualSlideNumber}`);
      } else try {
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
                sectionLabel: outlineSlide.sectionLabel ?? null,
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
        archetypeId: presWithLens?.pitchLens?.deckArchetype ?? undefined,
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

    // Commit the credit reservation (actually deducts credits)
    if (reservationId) {
      await this.creditReservation.commit(reservationId);
    }

    const totalSlides = outline.slides.length + slideNumberOffset;
    yield {
      type: 'token',
      content: `\n**Done!** Generated ${totalSlides} slides for "${outline.title}"${slideNumberOffset > 0 ? ` (${slideNumberOffset} auto-split)` : ''}. You can now:\n- Click any slide to edit inline\n- Ask me to modify specific slides ("make slide 3 more concise")\n- Use /theme to change the visual style\n- Use /export to download\n`,
    };

    // 8. Auto-generate images (non-blocking) if configured — skip for FREE tier
    const shouldGenerateImages = config.autoGenerateImages !== false
      && this.nanoBanana.isConfigured
      && this.tierEnforcement.canGenerateImages(userTier);
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

    // Emit generation_complete action for rich UI card
    const imageJobCount = shouldGenerateImages ? (await this.prisma.slide.count({
      where: { presentationId, imagePrompt: { not: null } },
    })) : 0;
    yield {
      type: 'action',
      content: '',
      metadata: {
        action: 'generation_complete',
        presentationId,
        deckTitle: outline.title,
        slideCount: totalSlides,
        themeName,
        imageCount: imageJobCount,
        isSamplePreview: isSamplePreview ?? false,
      },
    };

    // Build slideCards for message persistence
    const slideCardsForMessage = outline.slides.map((s, i) => ({
      id: allSlides[i]?.id ?? s.slideNumber.toString(),
      slideNumber: s.slideNumber,
      title: s.title,
      body: s.bulletPoints.map((b: string) => `- ${b}`).join('\n'),
      slideType: s.slideType,
      imageUrl: null,
    }));

    // Persist assistant message with slideCards in metadata
    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'assistant',
        content: `Generated ${totalSlides} slides for "${outline.title}".`,
        messageType: 'text',
        metadata: { slideCards: slideCardsForMessage },
      },
    });

    yield { type: 'done', content: '' };
    } catch (genErr) {
      // Release credit reservation on generation failure
      if (reservationId) {
        await this.creditReservation.release(reservationId).catch(() => {});
      }
      throw genErr;
    }
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

    // Reserve credits for rewrite
    let rewriteReservationId: string | undefined;
    try {
      const res = await this.creditReservation.reserve(userId, DECK_GENERATION_COST, CreditReason.DECK_GENERATION, presentationId);
      rewriteReservationId = res.reservationId;
    } catch {
      const bal = await this.credits.getBalance(userId).catch(() => 0);
      yield { type: 'error', content: `Not enough credits. Rewrite costs ${DECK_GENERATION_COST} credits. You have ${bal}.` };
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

    // Build archetype context for rewrite path
    const rewriteArchetypeContext = presentation.pitchLens?.deckArchetype
      ? this.archetypeResolver.buildArchetypeInjection(presentation.pitchLens.deckArchetype as DeckArchetype)
      : undefined;

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
      rewriteArchetypeContext,
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

    // Commit the credit reservation
    if (rewriteReservationId) {
      await this.creditReservation.commit(rewriteReservationId);
    }

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
    totalSlides?: number,
  ): Promise<GeneratedSlideContent> {
    let userPrompt = buildSlideGenerationUserPrompt(
      outlineSlide.slideNumber,
      outlineSlide.title,
      outlineSlide.bulletPoints,
      outlineSlide.slideType,
      priorSlides,
      totalSlides,
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
        LlmModel.SONNET,
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
    // VISUAL_HUMOR and SECTION_DIVIDER slides are intentionally minimal — skip density validation
    if (outlineSlide.slideType === 'VISUAL_HUMOR' || outlineSlide.slideType === 'SECTION_DIVIDER') {
      return {
        title: content.title || outlineSlide.title,
        body: content.body || '',
        speakerNotes: content.speakerNotes || `Key topic: ${outlineSlide.title}.`,
        imagePromptHint: content.imagePromptHint || `Vivid photorealistic scene for humor slide: ${outlineSlide.title}`,
      };
    }

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

  /** Slide types that skip the layout selection gate. */
  private static readonly SKIP_LAYOUT_TYPES = new Set([
    'TITLE', 'CTA', 'QUOTE', 'VISUAL_HUMOR', 'SECTION_DIVIDER', 'OUTLINE',
  ]);

  /** Layout alternatives by slide type. */
  private static readonly LAYOUT_ALTERNATIVES: Record<string, Array<{ slideType: string; name: string; description: string }>> = {
    CONTENT: [
      { slideType: 'COMPARISON', name: 'Comparison', description: 'Side-by-side comparison of two concepts' },
      { slideType: 'PROCESS', name: 'Process', description: 'Step-by-step flow or timeline' },
    ],
    DATA_METRICS: [
      { slideType: 'CONTENT', name: 'Content', description: 'Narrative explanation of the data' },
    ],
    PROBLEM: [
      { slideType: 'CONTENT', name: 'Content', description: 'General content layout' },
      { slideType: 'COMPARISON', name: 'Comparison', description: 'Before/after or problem/impact' },
    ],
    SOLUTION: [
      { slideType: 'PROCESS', name: 'Process', description: 'Step-by-step solution walkthrough' },
      { slideType: 'ARCHITECTURE', name: 'Architecture', description: 'Technical diagram layout' },
    ],
    ARCHITECTURE: [
      { slideType: 'PROCESS', name: 'Process', description: 'Sequential flow diagram' },
      { slideType: 'CONTENT', name: 'Content', description: 'Descriptive layout' },
    ],
    PROCESS: [
      { slideType: 'CONTENT', name: 'Content', description: 'Narrative explanation' },
      { slideType: 'COMPARISON', name: 'Comparison', description: 'Side-by-side step comparison' },
    ],
    COMPARISON: [
      { slideType: 'CONTENT', name: 'Content', description: 'Single narrative layout' },
      { slideType: 'DATA_METRICS', name: 'Data & Metrics', description: 'Chart/number-focused layout' },
    ],
  };

  private generateLayoutOptions(outlineSlide: OutlineSlide): Array<{ id: string; name: string; description: string; slideType: string }> {
    const original = {
      id: `layout-original-${outlineSlide.slideType}`,
      name: outlineSlide.slideType.replace(/_/g, ' '),
      description: `Original ${outlineSlide.slideType.replace(/_/g, ' ').toLowerCase()} layout`,
      slideType: outlineSlide.slideType,
    };

    const alternatives = GenerationService.LAYOUT_ALTERNATIVES[outlineSlide.slideType];
    if (!alternatives || alternatives.length === 0) return [original];

    return [
      original,
      ...alternatives.slice(0, 2).map((alt) => ({
        id: `layout-${alt.slideType.toLowerCase()}-${outlineSlide.slideNumber}`,
        name: alt.name,
        description: alt.description,
        slideType: alt.slideType,
      })),
    ];
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
