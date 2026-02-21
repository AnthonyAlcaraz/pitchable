import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService, LlmModel } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { GenerationService } from './generation.service.js';
import { IntentClassifierService } from './intent-classifier.service.js';
import { SlideModifierService } from './slide-modifier.service.js';
import { ValidationGateService } from './validation-gate.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { EmailService } from '../email/email.service.js';
import { ExportFormat } from '../../generated/prisma/enums.js';
import type { GenerationConfig } from './generation.service.js';
import {
  parseSlashCommand,
  getAvailableCommands,
} from './slash-command.parser.js';
import type { LlmMessage } from './llm.service.js';

export interface ChatStreamEvent {
  type: 'token' | 'done' | 'error' | 'action' | 'thinking' | 'progress';
  content: string;
  metadata?: Record<string, unknown>;
}

const OFF_TOPIC_RESPONSE =
  "I'm focused on helping you build great presentations. What would you like to work on for your deck?";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly generation: GenerationService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly slideModifier: SlideModifierService,
    private readonly validationGate: ValidationGateService,
    private readonly exportsService: ExportsService,
    private readonly emailService: EmailService,
  ) {}

  async *handleMessage(
    userId: string,
    presentationId: string,
    content: string,
  ): AsyncGenerator<ChatStreamEvent> {
    // Persist user message
    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'user',
        content,
      },
    });

    // Check for slash command
    const command = parseSlashCommand(content);
    if (command) {
      yield* this.handleSlashCommand(userId, presentationId, command.command, command.args);
      return;
    }

    // Check if this is an approval of a pending outline
    if (this.generation.hasPendingOutline(presentationId) && this.generation.isApproval(content)) {
      yield* this.generation.executeOutline(userId, presentationId);
      return;
    }

    // If outline is pending, only allow approval, retry, or slash commands — block free chat
    if (this.generation.hasPendingOutline(presentationId)) {
      if (this.generation.isRetryRequest(content)) {
        // Clear old outline and regenerate with the user's feedback
        this.generation.clearPendingOutline(presentationId);
        yield* this.generation.generateOutline(userId, presentationId, {
          topic: content,
          presentationType: 'STANDARD',
        });
        return;
      }
      // Block anything else — nudge toward approve/retry
      const msg = 'Please **approve** the outline to generate slides, or tell me what to change.';
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
      return;
    }

    // Check for validation responses (accept/edit/reject)
    const validationResponse = this.parseValidationResponse(content);
    if (validationResponse && this.validationGate.hasPendingValidation(presentationId)) {
      const pending = this.validationGate.getNextValidation(presentationId);
      if (pending) {
        const result = await this.validationGate.processValidation(
          userId,
          presentationId,
          pending.slideId,
          validationResponse,
        );
        yield { type: 'token', content: result.message };
        yield { type: 'done', content: '' };
        await this.persistAssistantMessage(presentationId, result.message);
        return;
      }
    }

    // Check if user is requesting a presentation (heuristic detection)
    const generationIntent = this.detectGenerationIntent(content);
    if (generationIntent) {
      yield* this.generation.generateOutline(userId, presentationId, generationIntent);
      return;
    }

    // Classify intent (works with or without slides)
    const slideCount = await this.prisma.slide.count({ where: { presentationId } });
    const intent = await this.intentClassifier.classify(content, slideCount > 0);

    // Block off-topic messages regardless of slide state
    if (intent.intent === 'off_topic' && intent.confidence >= 0.6) {
      yield { type: 'token', content: OFF_TOPIC_RESPONSE };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, OFF_TOPIC_RESPONSE);
      return;
    }

    if (slideCount > 0) {
      // Use classified intent for slide-level operations

      if (intent.confidence >= 0.7) {
        switch (intent.intent) {
          case 'modify_slide': {
            if (intent.slideNumber) {
              yield { type: 'thinking', content: 'Analyzing your request...' };
              yield { type: 'progress', content: `Reading slide ${intent.slideNumber}`, metadata: { step: 'read_slide', status: 'running' } };
              yield { type: 'progress', content: `Reading slide ${intent.slideNumber}`, metadata: { step: 'read_slide', status: 'complete' } };
              yield { type: 'progress', content: 'Generating updated content', metadata: { step: 'llm_modify', status: 'running' } };
              const result = await this.slideModifier.modifySlide(
                userId,
                presentationId,
                intent.slideNumber,
                intent.instruction ?? content,
              );
              yield { type: 'progress', content: 'Generating updated content', metadata: { step: 'llm_modify', status: 'complete' } };
              yield { type: 'progress', content: 'Saving changes', metadata: { step: 'save', status: 'running' } };
              yield { type: 'progress', content: 'Saving changes', metadata: { step: 'save', status: 'complete' } };
              yield { type: 'token', content: result.message };
              yield { type: 'done', content: '' };
              await this.persistAssistantMessage(presentationId, result.message);
              return;
            }
            break;
          }
          case 'add_slide': {
            const afterSlide = intent.slideNumber ?? slideCount;
            yield { type: 'thinking', content: 'Planning new slide...' };
            yield { type: 'progress', content: 'Analyzing deck structure', metadata: { step: 'analyze', status: 'running' } };
            yield { type: 'progress', content: 'Analyzing deck structure', metadata: { step: 'analyze', status: 'complete' } };
            yield { type: 'progress', content: `Generating slide after position ${afterSlide}`, metadata: { step: 'llm_add', status: 'running' } };
            const result = await this.slideModifier.addSlideWithContent(
              userId,
              presentationId,
              afterSlide,
              intent.instruction ?? content,
            );
            yield { type: 'progress', content: `Generating slide after position ${afterSlide}`, metadata: { step: 'llm_add', status: 'complete' } };
            yield { type: 'progress', content: 'Inserting into deck', metadata: { step: 'insert', status: 'running' } };
            yield { type: 'progress', content: 'Inserting into deck', metadata: { step: 'insert', status: 'complete' } };
            yield { type: 'token', content: result.message };
            yield { type: 'done', content: '' };
            await this.persistAssistantMessage(presentationId, result.message);
            return;
          }
          case 'delete_slide': {
            if (intent.slideNumber) {
              yield { type: 'thinking', content: 'Processing deletion...' };
              yield { type: 'progress', content: `Removing slide ${intent.slideNumber}`, metadata: { step: 'delete', status: 'running' } };
              const result = await this.slideModifier.deleteSlide(
                presentationId,
                intent.slideNumber,
              );
              yield { type: 'progress', content: `Removing slide ${intent.slideNumber}`, metadata: { step: 'delete', status: 'complete' } };
              yield { type: 'progress', content: 'Renumbering slides', metadata: { step: 'renumber', status: 'running' } };
              yield { type: 'progress', content: 'Renumbering slides', metadata: { step: 'renumber', status: 'complete' } };
              yield { type: 'token', content: result.message };
              yield { type: 'done', content: '' };
              await this.persistAssistantMessage(presentationId, result.message);
              return;
            }
            break;
          }
          case 'regenerate_slide': {
            if (intent.slideNumber) {
              yield { type: 'thinking', content: 'Planning regeneration...' };
              yield { type: 'progress', content: `Reading slide ${intent.slideNumber}`, metadata: { step: 'read_slide', status: 'running' } };
              yield { type: 'progress', content: `Reading slide ${intent.slideNumber}`, metadata: { step: 'read_slide', status: 'complete' } };
              yield { type: 'progress', content: 'Regenerating content from scratch', metadata: { step: 'llm_regen', status: 'running' } };
              const result = await this.slideModifier.modifySlide(
                userId,
                presentationId,
                intent.slideNumber,
                'Completely regenerate this slide with fresh content while keeping the same topic. Use rich type-specific formatting with **bold** on key terms.',
              );
              yield { type: 'progress', content: 'Regenerating content from scratch', metadata: { step: 'llm_regen', status: 'complete' } };
              yield { type: 'progress', content: 'Saving changes', metadata: { step: 'save', status: 'running' } };
              yield { type: 'progress', content: 'Saving changes', metadata: { step: 'save', status: 'complete' } };
              yield { type: 'token', content: result.message };
              yield { type: 'done', content: '' };
              await this.persistAssistantMessage(presentationId, result.message);
              return;
            }
            break;
          }
          case 'change_theme': {
            yield {
              type: 'action',
              content: `Changing theme based on: "${content}"`,
              metadata: { action: 'change_theme', instruction: content },
            };
            yield { type: 'done', content: '' };
            return;
          }
          // off_topic is already handled above before the slideCount check
          // generate_outline and general_chat fall through to default behavior
        }
      }
    }

    // Fast off-topic check before spending tokens on LLM streaming
    if (this.isObviouslyOffTopic(content)) {
      yield { type: 'token', content: OFF_TOPIC_RESPONSE };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, OFF_TOPIC_RESPONSE);
      return;
    }

    // Regular chat — build context and stream LLM response
    yield* this.streamLlmResponse(userId, presentationId, content);
  }

  private async *streamLlmResponse(
    userId: string,
    presentationId: string,
    content: string,
  ): AsyncGenerator<ChatStreamEvent> {
    yield { type: 'thinking', content: 'Thinking...' };

    yield { type: 'progress', content: 'Building context', metadata: { step: 'context', status: 'running' } };
    const systemPrompt = await this.contextBuilder.buildSystemPrompt(
      userId,
      presentationId,
    );

    const kbContext = await this.contextBuilder.retrieveKbContext(
      userId,
      content,
      5,
    );

    const history = await this.contextBuilder.buildChatHistory(
      presentationId,
      20,
    );
    yield { type: 'progress', content: 'Building context', metadata: { step: 'context', status: 'complete' } };

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: systemPrompt + kbContext,
      },
      ...history,
    ];

    yield { type: 'progress', content: 'Generating response', metadata: { step: 'llm_stream', status: 'running' } };
    let fullResponse = '';
    for await (const chunk of this.llm.streamChat(messages, LlmModel.SONNET)) {
      if (chunk.done) {
        yield { type: 'done', content: '' };
        break;
      }
      fullResponse += chunk.content;
      yield { type: 'token', content: chunk.content };
    }

    if (fullResponse) {
      await this.persistAssistantMessage(presentationId, fullResponse);
    }
  }

  private async *handleSlashCommand(
    userId: string,
    presentationId: string,
    command: string,
    args: string[],
  ): AsyncGenerator<ChatStreamEvent> {
    switch (command) {
      case 'help': {
        const cmds = getAvailableCommands();
        const helpText = cmds
          .map((c) => `**${c.command}** — ${c.description}`)
          .join('\n');
        yield { type: 'token', content: helpText };
        yield { type: 'done', content: '' };
        await this.persistAssistantMessage(presentationId, helpText);
        break;
      }
      case 'outline': {
        const topic = args.join(' ');
        if (!topic) {
          yield { type: 'token', content: 'Please provide a topic: `/outline Your Topic Here`' };
          yield { type: 'done', content: '' };
          break;
        }
        yield* this.generation.generateOutline(userId, presentationId, {
          topic,
          presentationType: 'STANDARD',
        });
        break;
      }
      case 'regenerate': {
        const topic = args.join(' ') || 'the current presentation topic';
        yield* this.generation.generateOutline(userId, presentationId, {
          topic,
          presentationType: 'STANDARD',
        });
        break;
      }
      case 'theme': {
        const themeName = args.join(' ') || '';
        yield {
          type: 'action',
          content: `Changing theme to: ${themeName}`,
          metadata: { action: 'change_theme', themeName },
        };
        yield { type: 'done', content: '' };
        break;
      }
      case 'export': {
        const formatArg = (args[0] || 'pptx').toUpperCase();
        const formatMap: Record<string, ExportFormat> = {
          PPTX: ExportFormat.PPTX,
          PDF: ExportFormat.PDF,
          HTML: ExportFormat.REVEAL_JS,
          REVEALJS: ExportFormat.REVEAL_JS,
          FIGMA: ExportFormat.FIGMA,
        };
        const format = formatMap[formatArg];

        if (!format) {
          const msg = `Unknown format "${formatArg}". Supported: pptx, pdf, html, figma`;
          yield { type: 'token', content: msg };
          yield { type: 'done', content: '' };
          await this.persistAssistantMessage(presentationId, msg);
          break;
        }

        yield { type: 'token', content: `Starting ${formatArg} export...\n\n` };

        try {
          const job = await this.exportsService.createExportJob(presentationId, format);
          await this.exportsService.processExport(job.id);
          const { url } = await this.exportsService.getSignedDownloadUrl(job.id);

          const msg = `Export complete! Your ${formatArg} file is ready.`;
          yield { type: 'token', content: msg };
          yield {
            type: 'action',
            content: msg,
            metadata: {
              action: 'export_ready',
              format: formatArg,
              jobId: job.id,
              downloadUrl: url,
            },
          };
          yield { type: 'done', content: '' };
          await this.persistAssistantMessage(presentationId, msg);
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Export failed';
          const msg = `Export failed: ${errMsg}`;
          yield { type: 'token', content: msg };
          yield { type: 'done', content: '' };
          await this.persistAssistantMessage(presentationId, msg);
        }
        break;
      }
      case 'email': {
        yield* this.handleEmailCommand(userId, presentationId, args);
        break;
      }
      case 'rewrite': {
        yield* this.generation.rewriteSlides(userId, presentationId);
        break;
      }
      case 'auto-approve': {
        const setting = args[0]?.toLowerCase();
        const enabled = setting !== 'off' && setting !== 'false' && setting !== 'disable';
        this.validationGate.setAutoApprove(presentationId, enabled);
        const msg = enabled
          ? 'Auto-approve **enabled**. Slides that pass content review will be accepted automatically.'
          : 'Auto-approve **disabled**. Each slide will need manual approval.';
        yield { type: 'token', content: msg };
        yield { type: 'done', content: '' };
        await this.persistAssistantMessage(presentationId, msg);
        break;
      }
      case 'config': {
        yield* this.handleConfigCommand(presentationId, args);
        break;
      }
      default: {
        yield {
          type: 'action',
          content: `Command /${command} will be handled in the generation pipeline.`,
          metadata: { action: command, args },
        };
        yield { type: 'done', content: '' };
        break;
      }
    }
  }

  private async *handleConfigCommand(
    presentationId: string,
    args: string[],
  ): AsyncGenerator<ChatStreamEvent> {
    const [setting, ...valueArgs] = args;
    const value = valueArgs.join(' ');

    const pres = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { pitchLens: true },
    });

    if (!pres?.pitchLensId || !pres.pitchLens) {
      const msg = 'No Pitch Lens linked to this presentation. Create one first or generate with /outline.';
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
      return;
    }

    if (!setting) {
      // Show current config
      const lens = pres.pitchLens;
      const msg = [
        '**Current configuration:**',
        `- **Bullets per slide**: ${lens.maxBulletsPerSlide ?? '4 (default)'}`,
        `- **Words per slide**: ${lens.maxWordsPerSlide ?? '50 (default)'}`,
        `- **Table rows**: ${lens.maxTableRows ?? '4 (default)'}`,
        `- **Image layout**: ${lens.imageLayout ?? 'RIGHT'}`,
        `- **Image frequency**: 1 per ${lens.imageFrequency} slides`,
        '',
        'Use `/config bullets 3`, `/config words 50`, `/config rows 3`, `/config images background`, `/config frequency 6` to change.',
      ].join('\n');
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
      return;
    }

    let msg = '';
    const lensId = pres.pitchLensId;

    switch (setting.toLowerCase()) {
      case 'bullets': {
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 2 || n > 6) {
          msg = 'Invalid value. Use `/config bullets <2-6>`.';
          break;
        }
        await this.prisma.pitchLens.update({ where: { id: lensId }, data: { maxBulletsPerSlide: n } });
        msg = `Max bullets per slide set to **${n}**. Will apply on next /regenerate or /rewrite.`;
        break;
      }
      case 'words': {
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 30 || n > 120) {
          msg = 'Invalid value. Use `/config words <30-120>`.';
          break;
        }
        await this.prisma.pitchLens.update({ where: { id: lensId }, data: { maxWordsPerSlide: n } });
        msg = `Max words per slide set to **${n}**. Will apply on next /regenerate or /rewrite.`;
        break;
      }
      case 'images': {
        const layout = value.toUpperCase();
        if (layout !== 'BACKGROUND' && layout !== 'RIGHT') {
          msg = 'Invalid value. Use `/config images background` or `/config images right`.';
          break;
        }
        await this.prisma.pitchLens.update({
          where: { id: lensId },
          data: { imageLayout: layout as 'BACKGROUND' | 'RIGHT' },
        });
        msg = `Image layout set to **${layout.toLowerCase()}**. Will apply on next export.`;
        break;
      }
      case 'frequency': {
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 0 || n > 20) {
          msg = 'Invalid value. Use `/config frequency <0-20>` (0 = no images).';
          break;
        }
        await this.prisma.pitchLens.update({ where: { id: lensId }, data: { imageFrequency: n } });
        msg = `Image frequency set to **1 per ${n} slides**. Will apply on next /regenerate.`;
        break;
      }
      case 'rows': {
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 2 || n > 8) {
          msg = 'Invalid value. Use `/config rows <2-8>`.';
          break;
        }
        await this.prisma.pitchLens.update({ where: { id: lensId }, data: { maxTableRows: n } });
        msg = `Max table rows per slide set to **${n}**. Will apply on next /regenerate or /rewrite.`;
        break;
      }
      default:
        msg = `Unknown setting "${setting}". Available: bullets, words, rows, images, frequency. Use \`/config\` to see current values.`;
    }

    yield { type: 'token', content: msg };
    yield { type: 'done', content: '' };
    await this.persistAssistantMessage(presentationId, msg);
  }

  private async *handleEmailCommand(
    userId: string,
    presentationId: string,
    args: string[],
  ): AsyncGenerator<ChatStreamEvent> {
    if (!this.emailService.isConfigured) {
      const msg = 'Email is not configured. Set RESEND_API_KEY to enable email delivery.';
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
      return;
    }

    // Parse args: /email [format] [email-address]
    const formatArg = (args[0] || 'pdf').toUpperCase();
    const format = formatArg === 'PPTX' ? ExportFormat.PPTX : ExportFormat.PDF;
    const formatLabel = format === ExportFormat.PPTX ? 'PPTX' : 'PDF';

    // Get email: from args or user's registered email
    let emailAddress = args[1] || '';
    if (!emailAddress) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      emailAddress = user?.email ?? '';
    }

    if (!emailAddress) {
      const msg = 'No email address found. Usage: `/email pdf user@example.com`';
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
      return;
    }

    yield { type: 'token', content: `Exporting ${formatLabel} and emailing to **${emailAddress}**...\n` };

    try {
      // 1. Generate export
      const job = await this.exportsService.createExportJob(presentationId, format);
      const exportBuffer = await this.exportsService.processExportAndGetBuffer(job.id);

      // 2. Get presentation info for email subject
      const presentation = await this.prisma.presentation.findUnique({
        where: { id: presentationId },
        select: { title: true, _count: { select: { slides: true } } },
      });

      const title = presentation?.title ?? 'Presentation';
      const slideCount = presentation?._count?.slides ?? 0;

      // 3. Build email
      const html = this.emailService.buildPresentationEmailHtml(title, slideCount, formatLabel);
      const filename = `${title.replace(/[^a-zA-Z0-9 -]/g, '').trim()}.${formatLabel.toLowerCase()}`;

      // 4. Send
      const result = await this.emailService.sendEmail({
        to: emailAddress,
        subject: `Pitchable: ${title}`,
        html,
        attachments: exportBuffer
          ? [{ filename, content: exportBuffer.toString('base64') }]
          : undefined,
      });

      if (result.success) {
        const msg = `Sent **${title}** as ${formatLabel} to **${emailAddress}**`;
        yield { type: 'token', content: msg };
        yield { type: 'done', content: '' };
        await this.persistAssistantMessage(presentationId, msg);
      } else {
        const msg = `Email failed: ${result.error}`;
        yield { type: 'token', content: msg };
        yield { type: 'done', content: '' };
        await this.persistAssistantMessage(presentationId, msg);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Email export failed';
      const msg = `Email failed: ${errMsg}`;
      yield { type: 'token', content: msg };
      yield { type: 'done', content: '' };
      await this.persistAssistantMessage(presentationId, msg);
    }
  }

  private detectGenerationIntent(content: string): GenerationConfig | null {
    const lower = content.toLowerCase();

    // Regex patterns allow modifiers between verb and noun
    // e.g. "create a 6-slide pitch", "make a short investor deck"
    const generationPatterns: RegExp[] = [
      /\b(create|make|generate|build)\b.*\b(presentation|deck|pitch|slides?)\b/,
      /\b(pitch deck|presentation|slides?|deck)\s+(about|on|for)\b/,
    ];

    const isGeneration = generationPatterns.some((pattern) => pattern.test(lower));
    if (!isGeneration) return null;

    let presentationType = 'STANDARD';
    if (lower.includes('pitch') || lower.includes('investor') || lower.includes('vc ')) {
      presentationType = 'VC_PITCH';
    } else if (lower.includes('technical') || lower.includes('architecture') || lower.includes('engineering')) {
      presentationType = 'TECHNICAL';
    } else if (lower.includes('executive') || lower.includes('briefing') || lower.includes('board')) {
      presentationType = 'EXECUTIVE';
    }

    return { topic: content, presentationType };
  }

  /**
   * Fast keyword-based off-topic detector. Blocks obvious abuse without any LLM call.
   * Only catches clear non-presentation queries. Ambiguous messages pass through
   * to the LLM classifier which has the `off_topic` intent.
   */
  private isObviouslyOffTopic(content: string): boolean {
    const lower = content.toLowerCase().trim();

    // Very short messages like "hi" or "hey" are fine — could be conversation starters
    if (lower.length < 10) return false;

    // Allow anything that mentions slides/deck/presentation keywords
    const presentationKeywords = [
      'slide', 'deck', 'presentation', 'pitch', 'outline', 'bullet',
      'theme', 'export', 'pptx', 'pdf', 'keynote', 'powerpoint',
      'speaker note', 'title slide', 'agenda', 'content slide',
    ];
    if (presentationKeywords.some((kw) => lower.includes(kw))) return false;

    // Block clear off-topic patterns
    const offTopicPatterns = [
      /write (?:me )?(?:a |an )?(?:poem|story|essay|song|email|letter|code|script|function)/,
      /(?:translate|convert) .+ (?:to|into) .+/,
      /(?:what|who|when|where|how|why) (?:is|are|was|were|did|does|do|can|could|would|will|has|have) (?!.*(?:slide|deck|present|pitch|bullet|theme))/,
      /(?:solve|calculate|compute|evaluate) /,
      /(?:explain|define|summarize) (?!.*(?:slide|deck|present|pitch))/,
      /(?:tell me|give me) (?:a joke|a recipe|a story|about yourself)/,
      /(?:help me with|assist with) (?:my |the )?(?:homework|code|coding|programming|math|essay|exam)/,
      /(?:python|javascript|typescript|java|sql|html|css|react|node|rust|go) /,
      /(?:recipe|cook|bake|ingredients) /,
      /(?:play|sing|draw|paint) (?!.*slide)/,
    ];

    return offTopicPatterns.some((pattern) => pattern.test(lower));
  }

  private async persistAssistantMessage(presentationId: string, content: string): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        presentationId,
        role: 'assistant',
        content,
      },
    });
  }

  /**
   * Parse a validation response from user message content.
   * Looks for "accept", "reject", or JSON-structured edit responses.
   */
  private parseValidationResponse(
    content: string,
  ): import('./validation-gate.service.js').ValidationResponse | null {
    const lower = content.trim().toLowerCase();

    if (lower === 'accept' || lower === 'accept slide' || lower === 'looks good') {
      return { action: 'accept', slideId: '' };
    }

    if (lower === 'reject' || lower === 'reject slide' || lower === 'remove slide' || lower === 'delete slide') {
      return { action: 'reject', slideId: '' };
    }

    // Check for structured edit: { action: "edit", ... }
    if (content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.action === 'edit' && parsed.editedContent) {
          return {
            action: 'edit',
            slideId: parsed.slideId ?? '',
            editedContent: parsed.editedContent,
          };
        }
      } catch {
        // Not JSON — fall through
      }
    }

    return null;
  }

  async getHistory(
    presentationId: string,
    options?: { limit?: number; cursor?: string },
  ) {
    const take = Math.min(options?.limit ?? 200, 500);
    const cursor = options?.cursor;

    const messages = await this.prisma.chatMessage.findMany({
      where: { presentationId },
      orderBy: { createdAt: 'asc' },
      take: take + 1, // fetch one extra to detect hasMore
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        role: true,
        content: true,
        messageType: true,
        metadata: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > take;
    const items = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return {
      messages: items,
      hasMore,
      nextCursor,
      hasPendingOutline: this.generation.hasPendingOutline(presentationId),
    };
  }
}
