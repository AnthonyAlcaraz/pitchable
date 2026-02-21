import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from '../chat/llm.service.js';
import { ContextBuilderService } from '../chat/context-builder.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { ContentReviewerService } from '../chat/content-reviewer.service.js';
import { TierEnforcementService } from '../credits/tier-enforcement.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { CreditReservationService } from '../credits/credit-reservation.service.js';
import { DECK_GENERATION_COST } from '../credits/tier-config.js';
import { ImagesService } from '../images/images.service.js';
import { NanoBananaService } from '../images/nano-banana.service.js';
import { QualityAgentsService } from '../chat/quality-agents.service.js';
import { VisualCriticService } from '../chat/visual-critic.service.js';
import { MarpExporterService } from '../exports/marp-exporter.service.js';
import type { SlideForReview } from '../chat/quality-agents.service.js';
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from '../chat/prompts/outline.prompt.js';
import type { GeneratedOutline } from '../chat/prompts/outline.prompt.js';
import {
  buildSlideGenerationSystemPrompt,
  buildSlideGenerationUserPrompt,
} from '../chat/prompts/slide-generation.prompt.js';
import { DEFAULT_SLIDE_RANGES } from '../chat/dto/generation-config.dto.js';
import { getFrameworkConfig } from '../pitch-lens/frameworks/story-frameworks.config.js';
import { buildPitchLensInjection } from '../pitch-lens/prompts/pitch-lens-injection.prompt.js';
import { getImageFrequencyForTheme, getThemeCategoryByName } from '../themes/themes.service.js';
import { ArchetypeResolverService } from '../pitch-lens/archetypes/archetype-resolver.service.js';
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  CreditReason,
} from '../../generated/prisma/enums.js';
import type { DeckArchetype } from '../../generated/prisma/enums.js';
import { isValidOutline, isValidSlideContent } from '../chat/validators.js';
import type { GeneratedSlideContent } from '../chat/validators.js';
import { validateSlideContent, suggestSplit, DENSITY_LIMITS } from '../constraints/density-validator.js';
import type { DensityLimits } from '../constraints/density-validator.js';

export interface SyncGenerationInput {
  topic: string;
  presentationType?: string;
  briefId?: string;
  pitchLensId?: string;
  themeId?: string;
}

@Injectable()
export class SyncGenerationService {
  private readonly logger = new Logger(SyncGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly constraints: ConstraintsService,
    private readonly contentReviewer: ContentReviewerService,
    private readonly tierEnforcement: TierEnforcementService,
    private readonly credits: CreditsService,
    private readonly creditReservation: CreditReservationService,
    private readonly imagesService: ImagesService,
    private readonly nanoBanana: NanoBananaService,
    private readonly qualityAgents: QualityAgentsService,
    private readonly visualCritic: VisualCriticService,
    private readonly marpExporter: MarpExporterService,
    private readonly archetypeResolver: ArchetypeResolverService,
  ) {}

  /** Timing helper — returns elapsed ms since start. */
  private elapsed(start: number): string {
    return `${((Date.now() - start) / 1000).toFixed(1)}s`;
  }

  /**
   * Generate a complete presentation synchronously.
   * Runs: tier check -> credit check -> outline -> slides -> review -> complete.
   */
  async generate(userId: string, input: SyncGenerationInput) {
    const t0 = Date.now();
    const timings: Record<string, number> = {};

    // 1. Tier enforcement
    const deckCheck = await this.tierEnforcement.canCreateDeck(userId);
    if (!deckCheck.allowed) {
      throw new BadRequestException(deckCheck.reason ?? 'Monthly deck limit reached.');
    }

    // 1b. Pitch Lens is required
    if (!input.pitchLensId) {
      throw new BadRequestException('pitchLensId is required for deck generation.');
    }

    // 2. Reserve credits upfront (prevents race conditions)
    const { reservationId } = await this.creditReservation.reserve(
      userId, DECK_GENERATION_COST, CreditReason.API_GENERATION,
    ).catch(() => {
      throw new BadRequestException(
        `Insufficient credits. Generation costs ${DECK_GENERATION_COST} credits.`,
      );
    });

    timings['preflight'] = Date.now() - t0;
    this.logger.log(`[TIMING] Preflight checks: ${this.elapsed(t0)}`);

    // 3. Resolve theme + fetch lens in parallel
    const tResolve = Date.now();
    const [themeId, pitchLens] = await Promise.all([
      this.resolveThemeId(input.themeId),
      input.pitchLensId
        ? this.prisma.pitchLens.findUnique({ where: { id: input.pitchLensId } })
        : Promise.resolve(null),
    ]);
    timings['resolve_theme_lens'] = Date.now() - tResolve;
    this.logger.log(`[TIMING] Resolve theme+lens: ${((Date.now() - tResolve) / 1000).toFixed(1)}s`);

    // 4. Create PROCESSING presentation
    const presentation = await this.prisma.presentation.create({
      data: {
        title: input.topic.substring(0, 100),
        sourceContent: input.topic,
        presentationType:
          (input.presentationType as PresentationType) ?? PresentationType.STANDARD,
        status: PresentationStatus.PROCESSING,
        themeId,
        userId,
        pitchLensId: input.pitchLensId ?? null,
        briefId: input.briefId ?? null,
      },
    });

    try {
      // 5. Resolve slide range and pitch lens context
      const presType = input.presentationType || 'STANDARD';
      const range = {
        min: DEFAULT_SLIDE_RANGES[presType]?.min ?? 8,
        max: DEFAULT_SLIDE_RANGES[presType]?.max ?? 16,
      };

      let pitchLensContext: string | undefined;
      let syncDensityOverrides: { maxBullets?: number; maxWords?: number; maxTableRows?: number } | undefined;
      let syncImageLayoutInstruction: string | undefined;
      let frameworkSlideStructure: string[] | undefined;
      if (pitchLens) {
        const framework = getFrameworkConfig(pitchLens.selectedFramework);
        pitchLensContext = buildPitchLensInjection({ ...pitchLens, framework });
        frameworkSlideStructure = framework?.slideStructure;
        if (framework) {
          range.min = framework.idealSlideRange.min;
          range.max = framework.idealSlideRange.max;
        }
        syncDensityOverrides = {
          maxBullets: pitchLens.maxBulletsPerSlide ?? undefined,
          maxWords: pitchLens.maxWordsPerSlide ?? undefined,
          maxTableRows: pitchLens.maxTableRows ?? undefined,
        };
        if (pitchLens.imageLayout === 'BACKGROUND') {
          syncImageLayoutInstruction = 'Place images as full-slide backgrounds at 15% opacity. Do not use side-panel images.';
        }
      }

      // 6. RAG retrieval + theme fetch in parallel
      const tRag = Date.now();
      const [kbContext, theme] = await Promise.all([
        input.briefId
          ? this.contextBuilder.retrieveBriefContext(userId, input.briefId, input.topic, 8)
          : this.contextBuilder.retrieveKbContext(userId, input.topic, 8),
        this.prisma.theme.findUnique({ where: { id: themeId } }),
      ]);
      timings['rag_retrieval'] = Date.now() - tRag;
      this.logger.log(`[TIMING] RAG retrieval + theme fetch: ${((Date.now() - tRag) / 1000).toFixed(1)}s (KB context: ${kbContext.length} chars)`);

      // 6b. Build archetype context
      const syncArchetypeContext = pitchLens?.deckArchetype
        ? this.archetypeResolver.buildArchetypeInjection(pitchLens.deckArchetype as DeckArchetype)
        : undefined;

      // 7. Generate outline
      const tOutline = Date.now();
      const outlineSystemPrompt = buildOutlineSystemPrompt(
        presType,
        range,
        kbContext,
        pitchLensContext,
        syncArchetypeContext,
      );
      const outlineUserPrompt = buildOutlineUserPrompt(input.topic, frameworkSlideStructure);

      const outline = await this.llm.completeJson<GeneratedOutline>(
        [
          { role: 'system', content: outlineSystemPrompt },
          { role: 'user', content: outlineUserPrompt },
        ],
        LlmModel.SONNET,
        isValidOutline,
        2,
      );
      timings['outline'] = Date.now() - tOutline;
      this.logger.log(`[TIMING] Outline generation (Opus): ${((Date.now() - tOutline) / 1000).toFixed(1)}s — ${outline.slides?.length ?? 0} slides planned`);

      if (!outline.slides?.length) {
        throw new Error('Generated outline was empty');
      }

      // 7b. Tier-based slide truncation: FREE tier gets sample preview only
      const syncUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
      const syncTier = syncUser?.tier ?? 'FREE';
      const maxSlidesLimit = this.tierEnforcement.getMaxSlidesPerDeck(syncTier);
      const isSyncSamplePreview = maxSlidesLimit !== null && outline.slides.length > maxSlidesLimit;

      if (isSyncSamplePreview) {
        this.logger.log(`Free tier slide truncation: ${outline.slides.length} -> ${maxSlidesLimit} slides`);
        outline.slides = outline.slides.slice(0, maxSlidesLimit);
        for (let j = 0; j < outline.slides.length; j++) {
          outline.slides[j].slideNumber = j + 1;
        }
      }

      // 8. Update presentation title from outline
      await this.prisma.presentation.update({
        where: { id: presentation.id },
        data: { title: outline.title },
      });

      // 9. Theme name for slide generation prompts (theme already fetched in step 6)
      const themeName = theme?.displayName ?? 'Pitchable Dark';

      // 10. Pre-fetch per-slide KB contexts in parallel
      const tSlideKb = Date.now();
      const dataHeavyTypes = ['DATA_METRICS', 'CONTENT', 'PROBLEM', 'SOLUTION', 'COMPARISON', 'ARCHITECTURE', 'PROCESS'];
      const slideKbContexts = await Promise.all(
        outline.slides.map((slide) =>
          dataHeavyTypes.includes(slide.slideType)
            ? this.contextBuilder.retrieveSlideContext(userId, slide.title, slide.bulletPoints, 2, 2)
            : Promise.resolve('')
        ),
      );
      const dataSlideCount = slideKbContexts.filter(c => c.length > 0).length;
      timings['slide_kb_prefetch'] = Date.now() - tSlideKb;
      this.logger.log(`[TIMING] Slide KB prefetch (parallel): ${((Date.now() - tSlideKb) / 1000).toFixed(1)}s — ${dataSlideCount}/${outline.slides.length} slides enriched`);

      // 11. Generate slides sequentially (Opus needs priorSlides for coherence)
      const priorSlides: Array<{ title: string; body: string }> = [];

      // PitchLens imageFrequency overrides theme default when set
      let syncImgFreq: string | undefined;
      if (pitchLens?.imageFrequency && pitchLens.imageFrequency > 0) {
        const freq = pitchLens.imageFrequency;
        if (freq === 1) {
          syncImgFreq = 'MANDATORY: Generate a non-empty imagePromptHint for EVERY slide. Every single slide MUST have an image. Never set imagePromptHint to empty string.';
        } else if (freq <= 2) {
          syncImgFreq = `MANDATORY: Generate a non-empty imagePromptHint for at least every other slide. At minimum 50% of slides MUST have a non-empty imagePromptHint. Do NOT set all to empty string — the client explicitly requested frequent images.`;
        } else if (freq <= 4) {
          syncImgFreq = `Generate imagePromptHint for ~1 in ${freq} slides. Prefer data visualizations, product screenshots, and hero images.`;
        } else {
          syncImgFreq = `Generate imagePromptHint for ~1 in ${freq} slides. Set to empty string "" for the rest.`;
        }
      } else {
        syncImgFreq = theme ? getImageFrequencyForTheme(theme.name) : undefined;
      }

      const tSlidesLoop = Date.now();
      const slideTimings: number[] = [];

      // Enforce section labels when PitchLens toggle is on
      const requireLabels = !!(pitchLens as unknown as Record<string, unknown> | null)?.showSectionLabels;
      if (requireLabels) {
        for (const sl of outline.slides) {
          if (!sl.sectionLabel || sl.sectionLabel.trim() === '') {
            sl.sectionLabel = sl.slideType.replace(/_/g, ' ');
          }
        }
        this.logger.debug('Section labels enforced on all outline slides');
      }

      // Enforce outline slide when PitchLens toggle is on
      const requireOutline = !!(pitchLens as unknown as Record<string, unknown> | null)?.showOutlineSlide;
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
        outline.slides.splice(1, 0, outlineSlideObj as typeof outline.slides[0]);
        for (let j = 0; j < outline.slides.length; j++) {
          outline.slides[j].slideNumber = j + 1;
        }
        this.logger.debug('Outline slide injected at position 2');
      }

      for (let i = 0; i < outline.slides.length; i++) {
        const tSlide = Date.now();
        const outlineSlide = outline.slides[i];

        const slideSystemPrompt = buildSlideGenerationSystemPrompt(
          presType,
          themeName,
          kbContext,
          pitchLensContext,
          undefined,
          syncImgFreq,
          syncDensityOverrides,
          syncImageLayoutInstruction,
          syncArchetypeContext,
        );
        let slideUserPrompt = buildSlideGenerationUserPrompt(
          outlineSlide.slideNumber,
          outlineSlide.title,
          outlineSlide.bulletPoints,
          outlineSlide.slideType,
          priorSlides,
          outline.slides.length,
        );

        // Inject pre-fetched per-slide KB context
        const slideKbContext = slideKbContexts[i];
        if (slideKbContext) {
          slideUserPrompt += `

ADDITIONAL EVIDENCE FOR THIS SLIDE (use specific data points from this context):
${slideKbContext}`;
        }

        const slideContent = await this.llm.completeJson<GeneratedSlideContent>(
          [
            { role: 'system', content: slideSystemPrompt },
            { role: 'user', content: slideUserPrompt },
          ],
          LlmModel.SONNET,
          isValidSlideContent,
          2,
        );
        const tSlideGen = Date.now() - tSlide;
        this.logger.log(`[TIMING] Slide ${i + 1}/${outline.slides.length} generation (Opus): ${(tSlideGen / 1000).toFixed(1)}s — "${outlineSlide.title.slice(0, 40)}"`);

        // Build custom density limits from PitchLens overrides
        const customLimits: DensityLimits = {
          ...DENSITY_LIMITS,
          ...(syncDensityOverrides?.maxBullets && { maxBulletsPerSlide: syncDensityOverrides.maxBullets }),
          ...(syncDensityOverrides?.maxWords && { maxWordsPerSlide: syncDensityOverrides.maxWords }),
          ...(syncDensityOverrides?.maxTableRows && { maxTableRows: syncDensityOverrides.maxTableRows }),
        };

        // Skip content review for intentionally minimal slides
        const skipSyncReview = outlineSlide.slideType === 'VISUAL_HUMOR' || outlineSlide.slideType === 'SECTION_DIVIDER';

        // Run content review (Haiku — lightweight density/quality check)
        const tReview = Date.now();
        let finalTitle = slideContent.title;
        let finalBody = slideContent.body;
        if (!skipSyncReview) try {
          const review = await this.contentReviewer.reviewSlide(
            {
              title: slideContent.title,
              body: slideContent.body,
              speakerNotes: slideContent.speakerNotes ?? '',
              slideType: outlineSlide.slideType,
            },
            customLimits,
          );

          if (review.verdict === 'NEEDS_SPLIT' && review.suggestedSplits?.length) {
            // Use the first split as the primary slide content (tighter)
            const firstSplit = review.suggestedSplits[0];
            finalTitle = firstSplit.title;
            finalBody = firstSplit.body;
            this.logger.log(`Sync slide ${i + 1} trimmed by content reviewer`);
          }

          if (review.issues.length > 0) {
            this.logger.debug(
              `Sync slide ${i + 1} review issues: ${review.issues.map((iss) => iss.message).join('; ')}`,
            );
          }
        } catch (reviewErr) {
          // Content review failed — log explicitly and keep original content
          this.logger.warn(`Content review error for sync slide ${i + 1}: ${reviewErr instanceof Error ? reviewErr.message : 'unknown'}`);
        }
        this.logger.debug(`[TIMING] Slide ${i + 1} content review (Haiku): ${((Date.now() - tReview) / 1000).toFixed(1)}s`);

        // Density validation: truncate table rows if over limit
        const densityResult = validateSlideContent({ title: finalTitle, body: finalBody }, customLimits);
        if (!densityResult.valid) {
          this.logger.debug(
            `Sync slide ${i + 1} density violations: ${densityResult.violations.join('; ')}`,
          );
        }

        await this.prisma.slide.create({
          data: {
            presentationId: presentation.id,
            slideNumber: i + 1,
            title: finalTitle,
            body: finalBody,
            speakerNotes: slideContent.speakerNotes ?? null,
            slideType: (outlineSlide.slideType as SlideType) ?? SlideType.CONTENT,
            imagePrompt: slideContent.imagePromptHint ?? null,
            sectionLabel: outlineSlide.sectionLabel ?? null,
          },
        });

        priorSlides.push({ title: finalTitle, body: finalBody });

        const slideTotal = Date.now() - tSlide;
        slideTimings.push(slideTotal);
      }

      timings['slides_loop'] = Date.now() - tSlidesLoop;
      const avgSlide = slideTimings.length > 0 ? (slideTimings.reduce((a, b) => a + b, 0) / slideTimings.length / 1000).toFixed(1) : '0';
      const minSlide = slideTimings.length > 0 ? (Math.min(...slideTimings) / 1000).toFixed(1) : '0';
      const maxSlide = slideTimings.length > 0 ? (Math.max(...slideTimings) / 1000).toFixed(1) : '0';
      this.logger.log(`[TIMING] Slide generation loop: ${((Date.now() - tSlidesLoop) / 1000).toFixed(1)}s total — ${outline.slides.length} slides, avg=${avgSlide}s, min=${minSlide}s, max=${maxSlide}s`);

      // 12. Multi-Agent Quality Review (Style + Narrative + Fact Check — all Opus 4.6)
      const allSyncSlides = await this.prisma.slide.findMany({
        where: { presentationId: presentation.id },
        orderBy: { slideNumber: 'asc' },
        select: { id: true, slideNumber: true, title: true, body: true, speakerNotes: true, slideType: true, imagePrompt: true },
      });

      const syncSlidesForReview: SlideForReview[] = allSyncSlides.map((s) => ({
        slideNumber: s.slideNumber,
        title: s.title,
        body: s.body,
        speakerNotes: s.speakerNotes ?? '',
        slideType: s.slideType,
        imagePromptHint: s.imagePrompt ?? undefined,
      }));

      const syncThemeCategory = getThemeCategoryByName(theme?.name ?? '');

      const tQuality = Date.now();
      try {
        const qualityResult = await this.qualityAgents.reviewPresentation(syncSlidesForReview, {
          themeCategory: syncThemeCategory,
          themeName,
          presentationType: presType,
          frameworkName: pitchLens?.selectedFramework ?? undefined,
          userId,
          presentationId: presentation.id,
          archetypeId: pitchLens?.deckArchetype ?? undefined,
        });

        // Apply auto-fixes
        for (const fix of qualityResult.fixes) {
          const slideToFix = allSyncSlides.find((s) => s.slideNumber === fix.slideNumber);
          if (slideToFix) {
            await this.prisma.slide.update({
              where: { id: slideToFix.id },
              data: { title: fix.fixedTitle, body: fix.fixedBody },
            });
          }
        }

        timings['quality_agents'] = Date.now() - tQuality;
        this.logger.log(
          `[TIMING] Quality agents: ${((Date.now() - tQuality) / 1000).toFixed(1)}s — style=${qualityResult.metrics.avgStyleScore.toFixed(2)} narrative=${qualityResult.metrics.narrativeScore.toFixed(2)} facts=${qualityResult.metrics.avgFactScore.toFixed(2)} fixes=${qualityResult.fixes.length}`,
        );
      } catch (qualityErr) {
        timings['quality_agents'] = Date.now() - tQuality;
        this.logger.warn(`Sync quality review failed (non-fatal) after ${((Date.now() - tQuality) / 1000).toFixed(1)}s: ${qualityErr}`);
      }

      // 12c. Visual critic (non-blocking)
      try {
        const tCritic = Date.now();
        
        const finalSlides = await this.prisma.slide.findMany({
          where: { presentationId: presentation.id },
          orderBy: { slideNumber: 'asc' },
        });
        const marpMd = this.marpExporter.generateMarpMarkdown(presentation, finalSlides, theme!);
        const criticResult = await this.visualCritic.reviewPresentation(marpMd, finalSlides.length);
        this.logger.log(
          `[TIMING] Visual critic: ${((Date.now() - tCritic) / 1000).toFixed(1)}s — ` +
          `score=${criticResult.overallScore.toFixed(2)} aesthetic=${criticResult.aestheticScore.toFixed(2)} diversity=${criticResult.diversityScore.toFixed(2)} ` +
          `issues=${criticResult.issues.length}`,
        );
        timings['visual_critic'] = Date.now() - tCritic;
      } catch (criticErr) {
        this.logger.warn(`Visual critic failed (non-fatal): ${criticErr}`);
      }

      // 13. Mark complete + deduct credits
      await this.prisma.presentation.update({
        where: { id: presentation.id },
        data: { status: PresentationStatus.COMPLETED },
      });

      // Commit the credit reservation (actually deducts)
      await this.creditReservation.commit(reservationId);

      // 12b. Auto-generate images (non-blocking) — skip for FREE tier
      if (this.nanoBanana.isConfigured && this.tierEnforcement.canGenerateImages(syncTier)) {
        this.imagesService
          .queueBatchGeneration(presentation.id, userId)
          .then(({ jobs, skippedForCredits }) => {
            if (skippedForCredits > 0) {
              this.logger.warn(`API generation: ${skippedForCredits} images skipped for insufficient credits`);
            }
            this.logger.log(`API generation: queued ${jobs.length} image jobs`);
          })
          .catch((err) =>
            this.logger.warn(
              `Auto image generation failed: ${err instanceof Error ? err.message : 'unknown'}`,
            ),
          );
      }

      // Final timing summary
      const totalMs = Date.now() - t0;
      timings['total'] = totalMs;
      this.logger.log(
        `[TIMING] === GENERATION COMPLETE === ${(totalMs / 1000).toFixed(1)}s total | ` +
        `outline=${((timings['outline'] ?? 0) / 1000).toFixed(1)}s | ` +
        `slides=${((timings['slides_loop'] ?? 0) / 1000).toFixed(1)}s (${outline.slides.length} slides) | ` +
        `quality=${((timings['quality_agents'] ?? 0) / 1000).toFixed(1)}s | ` +
        `rag=${((timings['rag_retrieval'] ?? 0) / 1000).toFixed(1)}s | ` +
        `presentation=${presentation.id}`,
      );

      // 14. Return full presentation with slides and theme
      return this.prisma.presentation.findUnique({
        where: { id: presentation.id },
        include: {
          slides: { orderBy: { slideNumber: 'asc' } },
          theme: true,
        },
      });
    } catch (err) {
      // Release credit reservation on failure
      await this.creditReservation.release(reservationId).catch(() => {});

      // Mark failed on error
      await this.prisma.presentation
        .update({
          where: { id: presentation.id },
          data: { status: PresentationStatus.FAILED },
        })
        .catch(() => {});

      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Sync generation failed: ${msg}`);
      throw new BadRequestException(`Generation failed: ${msg}`);
    }
  }

  private async resolveThemeId(themeId?: string): Promise<string> {
    if (themeId) {
      const exists = await this.prisma.theme.findUnique({ where: { id: themeId } });
      if (exists) return exists.id;
    }
    const defaultTheme = await this.prisma.theme.findFirst({
      where: { name: 'pitchable-dark' },
    });
    if (!defaultTheme) {
      const any = await this.prisma.theme.findFirst();
      if (!any) throw new BadRequestException('No themes available');
      return any.id;
    }
    return defaultTheme.id;
  }
}
