import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from '../chat/llm.service.js';
import { ContextBuilderService } from '../chat/context-builder.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { ContentReviewerService } from '../chat/content-reviewer.service.js';
import { TierEnforcementService } from '../credits/tier-enforcement.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { DECK_GENERATION_COST } from '../credits/tier-config.js';
import { ImagesService } from '../images/images.service.js';
import { NanoBananaService } from '../images/nano-banana.service.js';
import { QualityAgentsService } from '../chat/quality-agents.service.js';
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
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  CreditReason,
} from '../../generated/prisma/enums.js';
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
    private readonly imagesService: ImagesService,
    private readonly nanoBanana: NanoBananaService,
    private readonly qualityAgents: QualityAgentsService,
  ) {}

  /**
   * Generate a complete presentation synchronously.
   * Runs: tier check -> credit check -> outline -> slides -> review -> complete.
   */
  async generate(userId: string, input: SyncGenerationInput) {
    // 1. Tier enforcement
    const deckCheck = await this.tierEnforcement.canCreateDeck(userId);
    if (!deckCheck.allowed) {
      throw new BadRequestException(deckCheck.reason ?? 'Monthly deck limit reached.');
    }

    // 1b. Pitch Lens is required
    if (!input.pitchLensId) {
      throw new BadRequestException('pitchLensId is required for deck generation.');
    }

    // 2. Credit check
    const hasCredits = await this.credits.hasEnoughCredits(userId, DECK_GENERATION_COST);
    if (!hasCredits) {
      throw new BadRequestException(
        `Insufficient credits. Generation costs ${DECK_GENERATION_COST} credits.`,
      );
    }

    // 3. Resolve theme + fetch lens in parallel
    const [themeId, pitchLens] = await Promise.all([
      this.resolveThemeId(input.themeId),
      input.pitchLensId
        ? this.prisma.pitchLens.findUnique({ where: { id: input.pitchLensId } })
        : Promise.resolve(null),
    ]);

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
      if (pitchLens) {
        const framework = getFrameworkConfig(pitchLens.selectedFramework);
        pitchLensContext = buildPitchLensInjection({ ...pitchLens, framework });
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
      const [kbContext, theme] = await Promise.all([
        input.briefId
          ? this.contextBuilder.retrieveBriefContext(userId, input.briefId, input.topic, 8)
          : this.contextBuilder.retrieveKbContext(userId, input.topic, 8),
        this.prisma.theme.findUnique({ where: { id: themeId } }),
      ]);

      // 7. Generate outline
      const outlineSystemPrompt = buildOutlineSystemPrompt(
        presType,
        range,
        kbContext,
        pitchLensContext,
      );
      const outlineUserPrompt = buildOutlineUserPrompt(input.topic);

      const outline = await this.llm.completeJson<GeneratedOutline>(
        [
          { role: 'system', content: outlineSystemPrompt },
          { role: 'user', content: outlineUserPrompt },
        ],
        LlmModel.OPUS,
        isValidOutline,
        2,
      );

      if (!outline.slides?.length) {
        throw new Error('Generated outline was empty');
      }

      // 8. Update presentation title from outline
      await this.prisma.presentation.update({
        where: { id: presentation.id },
        data: { title: outline.title },
      });

      // 9. Theme name for slide generation prompts (theme already fetched in step 6)
      const themeName = theme?.displayName ?? 'Pitchable Dark';

      // 10. Pre-fetch per-slide KB contexts in parallel
      const dataHeavyTypes = ['DATA_METRICS', 'CONTENT', 'PROBLEM', 'SOLUTION', 'COMPARISON'];
      const slideKbContexts = await Promise.all(
        outline.slides.map((slide) =>
          dataHeavyTypes.includes(slide.slideType)
            ? this.contextBuilder.retrieveSlideContext(userId, slide.title, slide.bulletPoints, 2, 2)
            : Promise.resolve('')
        ),
      );

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

      for (let i = 0; i < outline.slides.length; i++) {
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
        );
        let slideUserPrompt = buildSlideGenerationUserPrompt(
          outlineSlide.slideNumber,
          outlineSlide.title,
          outlineSlide.bulletPoints,
          outlineSlide.slideType,
          priorSlides,
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
          LlmModel.OPUS,
          isValidSlideContent,
          2,
        );

        // Build custom density limits from PitchLens overrides
        const customLimits: DensityLimits = {
          ...DENSITY_LIMITS,
          ...(syncDensityOverrides?.maxBullets && { maxBulletsPerSlide: syncDensityOverrides.maxBullets }),
          ...(syncDensityOverrides?.maxWords && { maxWordsPerSlide: syncDensityOverrides.maxWords }),
          ...(syncDensityOverrides?.maxTableRows && { maxTableRows: syncDensityOverrides.maxTableRows }),
        };

        // Run content review (same Haiku pass as chat generation path)
        let finalTitle = slideContent.title;
        let finalBody = slideContent.body;
        try {
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
          },
        });

        priorSlides.push({ title: finalTitle, body: finalBody });
      }

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

      try {
        const qualityResult = await this.qualityAgents.reviewPresentation(syncSlidesForReview, {
          themeCategory: syncThemeCategory,
          themeName,
          presentationType: presType,
          frameworkName: pitchLens?.selectedFramework ?? undefined,
          userId,
          presentationId: presentation.id,
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

        this.logger.log(
          `Sync quality review: style=${qualityResult.metrics.avgStyleScore.toFixed(2)} narrative=${qualityResult.metrics.narrativeScore.toFixed(2)} facts=${qualityResult.metrics.avgFactScore.toFixed(2)} fixes=${qualityResult.fixes.length}`,
        );
      } catch (qualityErr) {
        this.logger.warn(`Sync quality review failed (non-fatal): ${qualityErr}`);
      }

      // 13. Mark complete + deduct credits
      await this.prisma.presentation.update({
        where: { id: presentation.id },
        data: { status: PresentationStatus.COMPLETED },
      });

      await this.credits.deductCredits(
        userId,
        DECK_GENERATION_COST,
        CreditReason.API_GENERATION,
        presentation.id,
      );

      // 12b. Auto-generate images (non-blocking)
      if (this.nanoBanana.isConfigured) {
        this.imagesService
          .queueBatchGeneration(presentation.id, userId)
          .catch((err) =>
            this.logger.warn(
              `Auto image generation failed: ${err instanceof Error ? err.message : 'unknown'}`,
            ),
          );
      }

      // 13. Return full presentation with slides and theme
      return this.prisma.presentation.findUnique({
        where: { id: presentation.id },
        include: {
          slides: { orderBy: { slideNumber: 'asc' } },
          theme: true,
        },
      });
    } catch (err) {
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
