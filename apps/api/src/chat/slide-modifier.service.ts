import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService } from './llm.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import type { SlideContent } from '../constraints/density-validator.js';
import { isValidModifiedSlideContent } from './validators.js';
import type { ModifiedSlideContent } from './validators.js';

const MODIFY_SLIDE_PROMPT = `You are a slide content editor. Modify the slide content according to the user's instruction.

CONSTRAINTS:
- Max 80 words in body
- Max 6 bullet points
- 1 key concept per slide
- Preserve the slide's core message unless explicitly asked to change it

Respond with valid JSON:
{
  "title": "Updated Title",
  "body": "- Updated bullet 1\\n- Updated bullet 2",
  "speakerNotes": "Updated speaker notes."
}

Only output JSON. No markdown fences.`;

@Injectable()
export class SlideModifierService {
  private readonly logger = new Logger(SlideModifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly constraints: ConstraintsService,
    private readonly events: EventsGateway,
  ) {}

  async modifySlide(
    presentationId: string,
    slideNumber: number,
    instruction: string,
  ): Promise<{ success: boolean; message: string }> {
    // Find the slide
    const slide = await this.prisma.slide.findFirst({
      where: { presentationId, slideNumber },
    });

    if (!slide) {
      return { success: false, message: `Slide ${slideNumber} not found.` };
    }

    // Build context for LLM
    const currentContent = `Title: ${slide.title}\nBody: ${slide.body}\nSpeaker Notes: ${slide.speakerNotes ?? 'None'}\nType: ${slide.slideType}`;

    try {
      const modified = await this.llm.completeJson<ModifiedSlideContent>(
        [
          { role: 'system', content: MODIFY_SLIDE_PROMPT },
          {
            role: 'user',
            content: `Current slide:\n${currentContent}\n\nInstruction: ${instruction}`,
          },
        ],
        undefined,
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
        // Auto-fix
        const fixResult = this.constraints.autoFixSlide(slideContent, {
          palette: { primary: '#60a5fa', secondary: '#94a3b8', accent: '#fbbf24', background: '#0f172a', text: '#e2e8f0' },
          headingFont: 'Inter',
          bodyFont: 'Roboto',
        });
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

  async addBlankSlide(
    presentationId: string,
    afterSlideNumber: number,
    title?: string,
  ): Promise<{ success: boolean; message: string }> {
    const newNumber = afterSlideNumber + 1;

    // Atomic transaction: shift existing slides + insert new one
    const slide = await this.prisma.$transaction(async (tx) => {
      // Shift subsequent slides (reverse order to avoid unique constraint conflicts)
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

      // Create new slide
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

    // Atomic transaction: delete + renumber
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
}
