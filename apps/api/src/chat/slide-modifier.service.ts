import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from './llm.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { ImagesService } from '../images/images.service.js';
import { NanoBananaService } from '../images/nano-banana.service.js';
import { buildModifySlideSystemPrompt, buildAddSlideSystemPrompt } from './prompts/modify-slide.prompt.js';
import { buildPitchLensInjection } from '../pitch-lens/prompts/pitch-lens-injection.prompt.js';
import { getFrameworkConfig } from '../pitch-lens/frameworks/story-frameworks.config.js';
import type { ThemeColorContext } from './prompts/slide-generation.prompt.js';
import type { SlideContent } from '../constraints/density-validator.js';
import { isValidModifiedSlideContent } from './validators.js';
import type { ModifiedSlideContent } from './validators.js';
import { isValidSlideContent } from './validators.js';
import type { GeneratedSlideContent } from './validators.js';
import { SlideType } from '../../generated/prisma/enums.js';

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
        LlmModel.SONNET,
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

  async addSlideWithContent(
    userId: string,
    presentationId: string,
    afterSlideNumber: number,
    instruction: string,
    slideType: SlideType = SlideType.CONTENT,
  ): Promise<{ success: boolean; message: string }> {
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
        LlmModel.SONNET,
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
        },
        position: newNumber,
      });

      // Queue image generation for new slide
      await this.queueImageForSlide(userId, slide.id, slide.title, slide.body, slideType, presentationId);

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
