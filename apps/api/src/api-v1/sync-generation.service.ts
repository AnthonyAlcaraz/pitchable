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
import { getImageFrequencyForTheme } from '../themes/themes.service.js';
import {
  PresentationType,
  PresentationStatus,
  SlideType,
  CreditReason,
} from '../../generated/prisma/enums.js';
import { isValidOutline, isValidSlideContent } from '../chat/validators.js';
import type { GeneratedSlideContent } from '../chat/validators.js';

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

    // 2. Credit check
    const hasCredits = await this.credits.hasEnoughCredits(userId, DECK_GENERATION_COST);
    if (!hasCredits) {
      throw new BadRequestException(
        `Insufficient credits. Generation costs ${DECK_GENERATION_COST} credits.`,
      );
    }

    // 3. Resolve theme
    const themeId = await this.resolveThemeId(input.themeId);

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
      let syncDensityOverrides: { maxBullets?: number; maxWords?: number } | undefined;
      let syncImageLayoutInstruction: string | undefined;
      if (input.pitchLensId) {
        const lens = await this.prisma.pitchLens.findUnique({
          where: { id: input.pitchLensId },
        });
        if (lens) {
          const framework = getFrameworkConfig(lens.selectedFramework);
          pitchLensContext = buildPitchLensInjection({ ...lens, framework });
          if (framework) {
            range.min = framework.idealSlideRange.min;
            range.max = framework.idealSlideRange.max;
          }
          syncDensityOverrides = {
            maxBullets: lens.maxBulletsPerSlide ?? undefined,
            maxWords: lens.maxWordsPerSlide ?? undefined,
          };
          if (lens.imageLayout === 'BACKGROUND') {
            syncImageLayoutInstruction = 'Place images as full-slide backgrounds at 15% opacity. Do not use side-panel images.';
          }
        }
      }

      // 6. RAG retrieval
      const kbContext = input.briefId
        ? await this.contextBuilder.retrieveBriefContext(
            userId,
            input.briefId,
            input.topic,
            8,
          )
        : await this.contextBuilder.retrieveKbContext(userId, input.topic, 8);

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
        LlmModel.SONNET,
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

      // 9. Get theme name for slide generation prompts
      const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
      const themeName = theme?.displayName ?? 'Pitchable Dark';

      // 10. Generate slides sequentially
      const priorSlides: Array<{ title: string; body: string }> = [];

      for (let i = 0; i < outline.slides.length; i++) {
        const outlineSlide = outline.slides[i];

        const syncImgFreq = theme ? getImageFrequencyForTheme(theme.name) : undefined;
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
        const slideUserPrompt = buildSlideGenerationUserPrompt(
          outlineSlide.slideNumber,
          outlineSlide.title,
          outlineSlide.bulletPoints,
          outlineSlide.slideType,
          priorSlides,
        );

        const slideContent = await this.llm.completeJson<GeneratedSlideContent>(
          [
            { role: 'system', content: slideSystemPrompt },
            { role: 'user', content: slideUserPrompt },
          ],
          LlmModel.OPUS,
          isValidSlideContent,
          2,
        );

        await this.prisma.slide.create({
          data: {
            presentationId: presentation.id,
            slideNumber: i + 1,
            title: slideContent.title,
            body: slideContent.body,
            speakerNotes: slideContent.speakerNotes ?? null,
            slideType: (outlineSlide.slideType as SlideType) ?? SlideType.CONTENT,
            imagePrompt: slideContent.imagePromptHint ?? null,
          },
        });

        priorSlides.push({ title: slideContent.title, body: slideContent.body });
      }

      // 11. Mark complete + deduct credits
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

      // 11b. Auto-generate images (non-blocking)
      if (this.nanoBanana.isConfigured) {
        this.imagesService
          .queueBatchGeneration(presentation.id, userId)
          .catch((err) =>
            this.logger.warn(
              `Auto image generation failed: ${err instanceof Error ? err.message : 'unknown'}`,
            ),
          );
      }

      // 12. Return full presentation with slides and theme
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
