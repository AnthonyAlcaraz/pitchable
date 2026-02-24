import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from './llm.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { ImagesService } from '../images/images.service.js';
import { NanoBananaService } from '../images/nano-banana.service.js';
import { buildModifySlideSystemPrompt, buildAddSlideSystemPrompt } from './prompts/modify-slide.prompt.js';
import { buildCascadeRegenPrompt } from './prompts/cascade-regen.prompt.js';
import { buildPitchLensInjection } from '../pitch-lens/prompts/pitch-lens-injection.prompt.js';
import { getFrameworkConfig } from '../pitch-lens/frameworks/story-frameworks.config.js';
import type { ThemeColorContext } from './prompts/slide-generation.prompt.js';
import type { SlideContent } from '../constraints/density-validator.js';
import { isValidModifiedSlideContent } from './validators.js';
import type { ModifiedSlideContent } from './validators.js';
import { isValidSlideContent } from './validators.js';
import type { GeneratedSlideContent } from './validators.js';
import { SlideType, CreditReason } from '../../generated/prisma/enums.js';
import { CreditsService } from '../credits/credits.service.js';
import { CreditReservationService } from '../credits/credit-reservation.service.js';
import { SLIDE_MODIFICATION_COST } from '../credits/tier-config.js';

@Injectable()
export class SlideModifierService {
  private readonly logger = new Logger(SlideModifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly constraints: ConstraintsService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly events: EventsGateway,
    private readonly imagesService: ImagesService,
    private readonly nanoBanana: NanoBananaService,
    private readonly credits: CreditsService,
    private readonly creditReservation: CreditReservationService,
  ) {}

  /**
   * Fetch theme colors and pitch lens context for a presentation.
   */
  private async getPresentationContext(presentationId: string): Promise<{
    themeColors: ThemeColorContext | undefined;
    presentationType: string;
    pitchLensContext: string | undefined;
    theme: { palette: { primary: string; secondary: string; accent: string; background: string; text: string }; headingFont: string; bodyFont: string };
  }> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: {
        presentationType: true,
        theme: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            backgroundColor: true,
            textColor: true,
            headingFont: true,
            bodyFont: true,
          },
        },
        pitchLens: true,
      },
    });

    const t = presentation?.theme;
    const themeColors: ThemeColorContext | undefined = t
      ? {
          primary: t.primaryColor,
          secondary: t.secondaryColor,
          accent: t.accentColor,
          background: t.backgroundColor,
          text: t.textColor,
          headingFont: t.headingFont,
          bodyFont: t.bodyFont,
        }
      : undefined;

    const theme = t
      ? {
          palette: { primary: t.primaryColor, secondary: t.secondaryColor, accent: t.accentColor, background: t.backgroundColor, text: t.textColor },
          headingFont: t.headingFont,
          bodyFont: t.bodyFont,
        }
      : {
          palette: { primary: '#60a5fa', secondary: '#94a3b8', accent: '#fbbf24', background: '#0f172a', text: '#e2e8f0' },
          headingFont: 'Inter',
          bodyFont: 'Roboto',
        };

    let pitchLensContext: string | undefined;
    if (presentation?.pitchLens) {
      const framework = getFrameworkConfig(presentation.pitchLens.selectedFramework);
      pitchLensContext = buildPitchLensInjection({
        ...presentation.pitchLens,
        framework,
      });
    }

    return {
      themeColors,
      presentationType: presentation?.presentationType ?? 'STANDARD',
      pitchLensContext,
      theme,
    };
  }

  async modifySlide(
    userId: string,
    presentationId: string,
    slideNumber: number,
    instruction: string,
  ): Promise<{ success: boolean; message: string }> {
    // Credit pre-check
    const hasCredits = await this.credits.hasEnoughCredits(userId, SLIDE_MODIFICATION_COST);
    if (!hasCredits) {
      return { success: false, message: `Not enough credits. Slide modification costs ${SLIDE_MODIFICATION_COST} credit.` };
    }

    const slide = await this.prisma.slide.findFirst({
      where: { presentationId, slideNumber },
    });

    if (!slide) {
      return { success: false, message: `Slide ${slideNumber} not found.` };
    }

    // Fetch presentation context (theme, pitch lens)
    const ctx = await this.getPresentationContext(presentationId);

    // Retrieve enriched context: KB (pgvector) + Omnisearch (vault)
    const kbContext = await this.contextBuilder.retrieveEnrichedContext(
      userId,
      `${slide.title} ${instruction}`,
      5,
      3,
    );

    // Build type-aware system prompt
    const systemPrompt = buildModifySlideSystemPrompt(
      slide.slideType,
      kbContext,
      ctx.themeColors,
      ctx.pitchLensContext,
    );

    const currentContent = `Title: ${slide.title}\nBody: ${slide.body}\nSpeaker Notes: ${slide.speakerNotes ?? 'None'}\nType: ${slide.slideType}`;

    try {
      const modified = await this.llm.completeJson<ModifiedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Current slide:\n${currentContent}\n\nInstruction: ${instruction}`,
          },
        ],
        LlmModel.OPUS,
        isValidModifiedSlideContent,
        2,
      );

      // Validate density
      const slideContent: SlideContent = {
        title: modified.title || slide.title,
        body: modified.body || slide.body,
      };
      const densityResult = this.constraints.validateDensity(slideContent);

      if (!densityResult.valid) {
        const fixResult = this.constraints.autoFixSlide(slideContent, ctx.theme);
        if (fixResult.fixed && fixResult.slides.length > 0) {
          modified.title = fixResult.slides[0].title;
          modified.body = fixResult.slides[0].body;
        }
      }

      // Update in DB
      const updated = await this.prisma.slide.update({
        where: { id: slide.id },
        data: {
          title: modified.title || slide.title,
          body: modified.body || slide.body,
          speakerNotes: modified.speakerNotes || slide.speakerNotes,
        },
      });

      // Broadcast via WebSocket
      this.events.emitSlideUpdated({
        presentationId,
        slideId: slide.id,
        data: {
          title: updated.title,
          body: updated.body,
          speakerNotes: updated.speakerNotes,
        },
      });

      // Queue image regeneration if configured
      await this.queueImageForSlide(userId, slide.id, updated.title, updated.body, slide.slideType, presentationId);

      // Charge credit for successful modification
      await this.credits.deductCredits(userId, SLIDE_MODIFICATION_COST, CreditReason.SLIDE_MODIFICATION, slide.id);

      return {
        success: true,
        message: `Updated slide ${slideNumber}: "${updated.title}"`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Slide modification failed: ${msg}`);
      return { success: false, message: `Failed to modify slide: ${msg}` };
    }
  }

  /**
   * Cascade regeneration: modify the primary slide, then regenerate all subsequent slides
   * to maintain narrative coherence. Uses credit reservation for atomic billing.
   */
  async cascadeRegenerateSlides(
    userId: string,
    presentationId: string,
    primarySlideNumber: number,
    feedback: string,
  ): Promise<{ success: boolean; message: string; modifiedCount: number }> {
    // Load all slides
    const allSlides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
    });

    const primarySlide = allSlides.find((s) => s.slideNumber === primarySlideNumber);
    if (!primarySlide) {
      return { success: false, message: `Slide ${primarySlideNumber} not found.`, modifiedCount: 0 };
    }

    const downstreamSlides = allSlides.filter((s) => s.slideNumber > primarySlideNumber);
    const totalCost = (1 + downstreamSlides.length) * SLIDE_MODIFICATION_COST;

    // Reserve credits atomically for all slides
    let reservationId: string;
    try {
      const reservation = await this.creditReservation.reserve(
        userId,
        totalCost,
        CreditReason.SLIDE_MODIFICATION,
        presentationId,
      );
      reservationId = reservation.reservationId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Insufficient credits';
      return { success: false, message: msg, modifiedCount: 0 };
    }

    try {
      // Step 1: Modify the primary slide
      const primaryResult = await this.modifySlideInternal(userId, presentationId, primarySlide, feedback);
      if (!primaryResult.success) {
        await this.creditReservation.release(reservationId);
        return { success: false, message: primaryResult.message, modifiedCount: 0 };
      }

      let modifiedCount = 1;

      // Step 2: Regenerate each downstream slide sequentially
      for (let i = 0; i < downstreamSlides.length; i++) {
        const targetSlide = downstreamSlides[i];

        // Emit progress
        this.events.emitCascadeProgress({
          presentationId,
          currentSlide: i + 1,
          totalSlides: downstreamSlides.length,
          slideId: targetSlide.id,
          slideTitle: targetSlide.title,
          status: 'regenerating',
        });

        // Reload all slides from DB to capture prior iteration changes
        const freshSlides = await this.prisma.slide.findMany({
          where: { presentationId },
          orderBy: { slideNumber: 'asc' },
        });

        const precedingSlides = freshSlides
          .filter((s) => s.slideNumber < targetSlide.slideNumber)
          .map((s) => ({
            slideNumber: s.slideNumber,
            title: s.title,
            body: s.body,
            slideType: s.slideType,
          }));

        const currentTarget = freshSlides.find((s) => s.id === targetSlide.id);
        if (!currentTarget) continue;

        const cascadeResult = await this.regenerateSingleCascadeSlide(
          userId,
          presentationId,
          precedingSlides,
          currentTarget,
          feedback,
          primarySlideNumber,
        );

        if (cascadeResult.success) {
          modifiedCount++;
          this.events.emitCascadeProgress({
            presentationId,
            currentSlide: i + 1,
            totalSlides: downstreamSlides.length,
            slideId: targetSlide.id,
            slideTitle: cascadeResult.title ?? targetSlide.title,
            status: 'complete',
          });
        }
      }

      // Commit credit reservation
      await this.creditReservation.commit(reservationId);

      // Emit cascade complete
      this.events.emitCascadeComplete({ presentationId });

      return {
        success: true,
        message: `Cascade complete: modified ${modifiedCount} slides.`,
        modifiedCount,
      };
    } catch (err) {
      // Release reservation on failure — partial results are kept in DB
      await this.creditReservation.release(reservationId);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Cascade regeneration failed: ${msg}`);
      this.events.emitCascadeComplete({ presentationId });
      return { success: false, message: `Cascade failed: ${msg}`, modifiedCount: 0 };
    }
  }

  /**
   * Internal slide modification (no credit handling — caller manages credits).
   */
  private async modifySlideInternal(
    userId: string,
    presentationId: string,
    slide: { id: string; title: string; body: string; speakerNotes: string | null; slideType: string; slideNumber: number },
    instruction: string,
  ): Promise<{ success: boolean; message: string }> {
    const ctx = await this.getPresentationContext(presentationId);

    const kbContext = await this.contextBuilder.retrieveEnrichedContext(
      userId,
      `${slide.title} ${instruction}`,
      5,
      3,
    );

    const systemPrompt = buildModifySlideSystemPrompt(
      slide.slideType,
      kbContext,
      ctx.themeColors,
      ctx.pitchLensContext,
    );

    const currentContent = `Title: ${slide.title}\nBody: ${slide.body}\nSpeaker Notes: ${slide.speakerNotes ?? 'None'}\nType: ${slide.slideType}`;

    try {
      const modified = await this.llm.completeJson<ModifiedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current slide:\n${currentContent}\n\nInstruction: ${instruction}` },
        ],
        LlmModel.OPUS,
        isValidModifiedSlideContent,
        2,
      );

      const slideContent: SlideContent = {
        title: modified.title || slide.title,
        body: modified.body || slide.body,
      };
      const densityResult = this.constraints.validateDensity(slideContent);

      if (!densityResult.valid) {
        const fixResult = this.constraints.autoFixSlide(slideContent, ctx.theme);
        if (fixResult.fixed && fixResult.slides.length > 0) {
          modified.title = fixResult.slides[0].title;
          modified.body = fixResult.slides[0].body;
        }
      }

      const updated = await this.prisma.slide.update({
        where: { id: slide.id },
        data: {
          title: modified.title || slide.title,
          body: modified.body || slide.body,
          speakerNotes: modified.speakerNotes || slide.speakerNotes,
        },
      });

      this.events.emitSlideUpdated({
        presentationId,
        slideId: slide.id,
        data: {
          title: updated.title,
          body: updated.body,
          speakerNotes: updated.speakerNotes,
        },
      });

      await this.queueImageForSlide(userId, slide.id, updated.title, updated.body, slide.slideType, presentationId);

      return { success: true, message: `Updated slide ${slide.slideNumber}: "${updated.title}"` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Internal slide modification failed: ${msg}`);
      return { success: false, message: `Failed to modify slide: ${msg}` };
    }
  }

  /**
   * Regenerate a single downstream slide during cascade, using full narrative context.
   */
  private async regenerateSingleCascadeSlide(
    userId: string,
    presentationId: string,
    precedingSlides: Array<{ slideNumber: number; title: string; body: string; slideType: string }>,
    targetSlide: { id: string; title: string; body: string; speakerNotes: string | null; slideType: string; slideNumber: number; imageUrl?: string | null },
    originalFeedback: string,
    primarySlideNumber: number,
  ): Promise<{ success: boolean; title?: string }> {
    const ctx = await this.getPresentationContext(presentationId);

    const kbContext = await this.contextBuilder.retrieveEnrichedContext(
      userId,
      `${targetSlide.title} ${originalFeedback}`,
      5,
      3,
    );

    const systemPrompt = buildCascadeRegenPrompt(
      precedingSlides,
      {
        title: targetSlide.title,
        body: targetSlide.body,
        speakerNotes: targetSlide.speakerNotes,
        slideType: targetSlide.slideType,
      },
      originalFeedback,
      primarySlideNumber,
      kbContext,
      ctx.themeColors,
      ctx.pitchLensContext,
    );

    try {
      const modified = await this.llm.completeJson<ModifiedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Adapt this slide for narrative coherence with the updated preceding slides.' },
        ],
        LlmModel.OPUS,
        isValidModifiedSlideContent,
        2,
      );

      const slideContent: SlideContent = {
        title: modified.title || targetSlide.title,
        body: modified.body || targetSlide.body,
      };
      const densityResult = this.constraints.validateDensity(slideContent);

      if (!densityResult.valid) {
        const fixResult = this.constraints.autoFixSlide(slideContent, ctx.theme);
        if (fixResult.fixed && fixResult.slides.length > 0) {
          modified.title = fixResult.slides[0].title;
          modified.body = fixResult.slides[0].body;
        }
      }

      const updated = await this.prisma.slide.update({
        where: { id: targetSlide.id },
        data: {
          title: modified.title || targetSlide.title,
          body: modified.body || targetSlide.body,
          speakerNotes: modified.speakerNotes || targetSlide.speakerNotes,
        },
      });

      this.events.emitSlideUpdated({
        presentationId,
        slideId: targetSlide.id,
        data: {
          title: updated.title,
          body: updated.body,
          speakerNotes: updated.speakerNotes,
        },
      });

      // Queue image regen if slide had an image
      if (targetSlide.imageUrl) {
        await this.queueImageForSlide(userId, targetSlide.id, updated.title, updated.body, targetSlide.slideType, presentationId);
      }

      return { success: true, title: updated.title };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Cascade regen failed for slide ${targetSlide.slideNumber}: ${msg}`);
      return { success: false };
    }
  }

  async addSlideWithContent(
    userId: string,
    presentationId: string,
    afterSlideNumber: number,
    instruction: string,
    slideType: SlideType = SlideType.CONTENT,
  ): Promise<{ success: boolean; message: string }> {
    // Credit pre-check
    const hasCredits = await this.credits.hasEnoughCredits(userId, SLIDE_MODIFICATION_COST);
    if (!hasCredits) {
      return { success: false, message: `Not enough credits. Adding a slide costs ${SLIDE_MODIFICATION_COST} credit.` };
    }

    const newNumber = afterSlideNumber + 1;

    // Fetch presentation context
    const ctx = await this.getPresentationContext(presentationId);

    // Retrieve enriched context: KB (pgvector) + Omnisearch (vault)
    const kbContext = await this.contextBuilder.retrieveEnrichedContext(
      userId,
      instruction,
      5,
      3,
    );

    // Get surrounding slides for narrative context
    const surroundingSlides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
      select: { slideNumber: true, title: true, body: true, slideType: true },
    });

    const priorContext = surroundingSlides
      .filter((s) => s.slideNumber <= afterSlideNumber)
      .slice(-3)
      .map((s) => `  ${s.slideNumber}. [${s.slideType}] ${s.title}`)
      .join('\n');

    const nextContext = surroundingSlides
      .filter((s) => s.slideNumber > afterSlideNumber)
      .slice(0, 2)
      .map((s) => `  ${s.slideNumber}. [${s.slideType}] ${s.title}`)
      .join('\n');

    // Build type-aware system prompt
    const systemPrompt = buildAddSlideSystemPrompt(
      slideType,
      ctx.presentationType,
      kbContext,
      ctx.themeColors,
      ctx.pitchLensContext,
    );

    const userPrompt = `Generate a new slide to insert at position ${newNumber}.
User instruction: ${instruction}
${priorContext ? `\nPreceding slides:\n${priorContext}` : ''}
${nextContext ? `\nFollowing slides:\n${nextContext}` : ''}

The new slide should fit naturally in the deck's narrative flow.`;

    try {
      const generated = await this.llm.completeJson<GeneratedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        LlmModel.OPUS,
        isValidSlideContent,
        2,
      );

      // Atomic transaction: shift existing slides + insert new one
      const slide = await this.prisma.$transaction(async (tx) => {
        const toShift = await tx.slide.findMany({
          where: { presentationId, slideNumber: { gte: newNumber } },
          orderBy: { slideNumber: 'desc' },
          select: { id: true, slideNumber: true },
        });

        for (const s of toShift) {
          await tx.slide.update({
            where: { id: s.id },
            data: { slideNumber: s.slideNumber + 1 },
          });
        }

        return tx.slide.create({
          data: {
            presentationId,
            slideNumber: newNumber,
            title: generated.title,
            body: generated.body,
            speakerNotes: generated.speakerNotes,
            slideType,
            imagePrompt: generated.imagePromptHint || null,
          },
        });
      });

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
          previewUrl: null,
        },
        position: newNumber,
      });

      // Queue image generation for new slide
      await this.queueImageForSlide(userId, slide.id, slide.title, slide.body, slideType, presentationId);

      // Charge credit for successful slide addition
      await this.credits.deductCredits(userId, SLIDE_MODIFICATION_COST, CreditReason.SLIDE_MODIFICATION, slide.id);

      return { success: true, message: `Added slide ${newNumber}: "${generated.title}"` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Add slide with content failed: ${msg}`);
      // Fallback to blank slide if LLM fails
      return this.addBlankSlide(presentationId, afterSlideNumber, instruction);
    }
  }

  async addBlankSlide(
    presentationId: string,
    afterSlideNumber: number,
    title?: string,
  ): Promise<{ success: boolean; message: string }> {
    const newNumber = afterSlideNumber + 1;

    const slide = await this.prisma.$transaction(async (tx) => {
      const toShift = await tx.slide.findMany({
        where: { presentationId, slideNumber: { gte: newNumber } },
        orderBy: { slideNumber: 'desc' },
        select: { id: true, slideNumber: true },
      });

      for (const s of toShift) {
        await tx.slide.update({
          where: { id: s.id },
          data: { slideNumber: s.slideNumber + 1 },
        });
      }

      return tx.slide.create({
        data: {
          presentationId,
          slideNumber: newNumber,
          title: title || 'New Slide',
          body: '',
          speakerNotes: '',
          slideType: 'CONTENT',
        },
      });
    });

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
        previewUrl: null,
      },
      position: newNumber,
    });

    return { success: true, message: `Added new slide at position ${newNumber}.` };
  }

  async deleteSlide(
    presentationId: string,
    slideNumber: number,
  ): Promise<{ success: boolean; message: string }> {
    const slide = await this.prisma.slide.findFirst({
      where: { presentationId, slideNumber },
    });

    if (!slide) {
      return { success: false, message: `Slide ${slideNumber} not found.` };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.slide.delete({ where: { id: slide.id } });

      const remaining = await tx.slide.findMany({
        where: { presentationId },
        orderBy: { slideNumber: 'asc' },
        select: { id: true, slideNumber: true },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].slideNumber !== i + 1) {
          await tx.slide.update({
            where: { id: remaining[i].id },
            data: { slideNumber: i + 1 },
          });
        }
      }
    });

    this.events.emitSlideRemoved({ presentationId, slideId: slide.id });

    return { success: true, message: `Deleted slide ${slideNumber}: "${slide.title}"` };
  }

  /**
   * Queue image generation for a single slide if Replicate is configured.
   * Clears existing imageUrl so queueBatchGeneration picks it up.
   */
  private async queueImageForSlide(
    userId: string,
    slideId: string,
    title: string,
    body: string,
    slideType: string,
    presentationId: string,
  ): Promise<void> {
    if (!this.nanoBanana.isConfigured) {
      return;
    }

    try {
      // Clear existing image so queueBatchGeneration will regenerate it
      await this.prisma.slide.update({
        where: { id: slideId },
        data: { imageUrl: null },
      });

      // queueBatchGeneration skips slides that already have imageUrl,
      // so only the cleared slide gets a new image
      await this.imagesService.queueBatchGeneration(presentationId, userId);

      this.logger.log(`Queued image regeneration for slide ${slideId}`);
    } catch (err) {
      this.logger.warn(`Image queue failed for slide ${slideId}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
}
