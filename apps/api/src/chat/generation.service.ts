import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { ConstraintsService } from '../constraints/constraints.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { ContentReviewerService } from './content-reviewer.service.js';
import { FeedbackLogService } from './feedback-log.service.js';
import { ValidationGateService } from './validation-gate.service.js';
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
import {
  PresentationType,
  PresentationStatus,
  SlideType,
} from '../../generated/prisma/enums.js';
import type { SlideContent } from '../constraints/density-validator.js';
import { TtlMap } from '../common/ttl-map.js';
import type { ChatStreamEvent } from './chat.service.js';
import { isValidOutline, isValidSlideContent } from './validators.js';
import type { GeneratedSlideContent } from './validators.js';

// ── Interfaces ──────────────────────────────────────────────

export interface GenerationConfig {
  topic: string;
  presentationType: string;
  themeId?: string;
  minSlides?: number;
  maxSlides?: number;
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

    // 1. RAG retrieval
    const kbContext = await this.contextBuilder.retrieveKbContext(
      userId,
      config.topic,
      8,
    );

    // 2. Generate outline via LLM (JSON mode)
    const systemPrompt = buildOutlineSystemPrompt(presType, range, kbContext);
    const userPrompt = buildOutlineUserPrompt(config.topic);

    yield { type: 'token', content: 'Generating outline' };

    let outline: GeneratedOutline;
    try {
      outline = await this.llm.completeJson<GeneratedOutline>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        undefined,
        isValidOutline,
        2,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Outline generation failed: ${msg}`);
      yield { type: 'error', content: `Failed to generate outline: ${msg}` };
      return;
    }

    // Validate outline has slides
    if (!outline.slides || outline.slides.length === 0) {
      yield { type: 'error', content: 'Generated outline was empty. Please try again with more detail.' };
      return;
    }

    // 3. Store pending outline
    this.pendingOutlines.set(presentationId, { outline, config });

    // 4. Stream outline as readable markdown
    yield { type: 'token', content: `...\n\n` };
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

    yield { type: 'token', content: `Generating **${outline.title}** — ${outline.slides.length} slides...\n\n` };

    // 1. Resolve theme
    const themeId = await this.resolveThemeId(config.themeId);
    const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
    const themeName = theme?.displayName ?? 'dark-professional';

    // 2. Get KB context for slide generation
    const kbContext = await this.contextBuilder.retrieveKbContext(
      userId,
      config.topic,
      8,
    );

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

    // 5. Build slide system prompt with user feedback injection
    const feedbackBlock = await this.contextBuilder.buildFeedbackBlock(userId);
    const slideSystemPrompt = buildSlideGenerationSystemPrompt(
      config.presentationType,
      themeName,
      kbContext,
    ) + feedbackBlock;

    // Track offset when NEEDS_SPLIT inserts extra slides
    let slideNumberOffset = 0;
    const generatedSlides: Array<{ title: string; body: string }> = [];

    for (const outlineSlide of outline.slides) {
      const actualSlideNumber = outlineSlide.slideNumber + slideNumberOffset;

      yield {
        type: 'token',
        content: `Generating slide ${outlineSlide.slideNumber}/${outline.slides.length}: **${outlineSlide.title}**...\n`,
      };

      // Emit progress via WebSocket
      this.events.emitGenerationProgress({
        presentationId,
        step: `slide-${outlineSlide.slideNumber}`,
        progress: outlineSlide.slideNumber / outline.slides.length,
        message: `Generating slide ${outlineSlide.slideNumber}/${outline.slides.length}: ${outlineSlide.title}`,
      });

      const slideContent = await this.generateSlideContent(
        slideSystemPrompt,
        outlineSlide,
        generatedSlides,
      );

      // Validate density and auto-fix
      const validated = this.validateSlideContent(slideContent, outlineSlide);

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

      // Run content reviewer and queue validation
      let reviewPassed = true;
      try {
        const review = await this.contentReviewer.reviewSlide({
          title: validated.title,
          body: validated.body,
          speakerNotes: validated.speakerNotes,
          slideType: outlineSlide.slideType,
        });

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

        // Handle NEEDS_SPLIT: insert additional split slides
        if (review.verdict === 'NEEDS_SPLIT' && review.suggestedSplits && review.suggestedSplits.length > 1) {
          this.logger.log(
            `Slide ${actualSlideNumber} needs split into ${review.suggestedSplits.length} slides`,
          );

          // Update the original slide with the first split's content
          const firstSplit = review.suggestedSplits[0];
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

          // Insert remaining splits as new slides
          for (let si = 1; si < review.suggestedSplits.length; si++) {
            slideNumberOffset++;
            const splitNum = actualSlideNumber + si;
            const splitData = review.suggestedSplits[si];

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
        }
      } catch {
        // Content review failed — treat as passed
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
    }

    // 6. Mark presentation as completed
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { status: PresentationStatus.COMPLETED },
    });

    const totalSlides = outline.slides.length + slideNumberOffset;
    yield {
      type: 'token',
      content: `\n**Done!** Generated ${totalSlides} slides for "${outline.title}"${slideNumberOffset > 0 ? ` (${slideNumberOffset} auto-split)` : ''}. You can now:\n- Click any slide to edit inline\n- Ask me to modify specific slides ("make slide 3 more concise")\n- Use /theme to change the visual style\n- Use /export to download\n`,
    };

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

  // ── Private Helpers ───────────────────────────────────────

  private async generateSlideContent(
    systemPrompt: string,
    outlineSlide: OutlineSlide,
    priorSlides: Array<{ title: string; body: string }> = [],
  ): Promise<GeneratedSlideContent> {
    const userPrompt = buildSlideGenerationUserPrompt(
      outlineSlide.slideNumber,
      outlineSlide.title,
      outlineSlide.bulletPoints,
      outlineSlide.slideType,
      priorSlides,
    );

    try {
      return await this.llm.completeJson<GeneratedSlideContent>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        undefined,
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
          primary: '#60a5fa',
          secondary: '#94a3b8',
          accent: '#fbbf24',
          background: '#0f172a',
          text: '#e2e8f0',
        },
        headingFont: 'Inter',
        bodyFont: 'Roboto',
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
      where: { name: 'dark-professional' },
    });
    if (defaultTheme) return defaultTheme.id;

    const anyTheme = await this.prisma.theme.findFirst({
      where: { isBuiltIn: true },
    });
    return anyTheme?.id ?? '';
  }
}
