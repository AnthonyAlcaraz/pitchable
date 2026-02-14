import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LlmService } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { GenerationService } from './generation.service.js';
import { IntentClassifierService } from './intent-classifier.service.js';
import { SlideModifierService } from './slide-modifier.service.js';
import { ValidationGateService } from './validation-gate.service.js';
import type { GenerationConfig } from './generation.service.js';
import {
  parseSlashCommand,
  getAvailableCommands,
} from './slash-command.parser.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

export interface ChatStreamEvent {
  type: 'token' | 'done' | 'error' | 'action';
  content: string;
  metadata?: Record<string, unknown>;
}

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

    // Check if presentation has slides for intent classification
    const slideCount = await this.prisma.slide.count({ where: { presentationId } });

    if (slideCount > 0) {
      // Use intent classifier for slide-level operations
      const intent = await this.intentClassifier.classify(content, true);

      if (intent.confidence >= 0.7) {
        switch (intent.intent) {
          case 'modify_slide': {
            if (intent.slideNumber) {
              yield { type: 'token', content: `Modifying slide ${intent.slideNumber}...\n` };
              const result = await this.slideModifier.modifySlide(
                presentationId,
                intent.slideNumber,
                intent.instruction ?? content,
              );
              yield { type: 'token', content: result.message };
              yield { type: 'done', content: '' };
              await this.persistAssistantMessage(presentationId, result.message);
              return;
            }
            break;
          }
          case 'add_slide': {
            const afterSlide = intent.slideNumber ?? slideCount;
            yield { type: 'token', content: `Adding a new slide after slide ${afterSlide}...\n` };
            const result = await this.slideModifier.addBlankSlide(
              presentationId,
              afterSlide,
              intent.instruction,
            );
            yield { type: 'token', content: result.message };
            yield { type: 'done', content: '' };
            await this.persistAssistantMessage(presentationId, result.message);
            return;
          }
          case 'delete_slide': {
            if (intent.slideNumber) {
              yield { type: 'token', content: `Deleting slide ${intent.slideNumber}...\n` };
              const result = await this.slideModifier.deleteSlide(
                presentationId,
                intent.slideNumber,
              );
              yield { type: 'token', content: result.message };
              yield { type: 'done', content: '' };
              await this.persistAssistantMessage(presentationId, result.message);
              return;
            }
            break;
          }
          case 'regenerate_slide': {
            if (intent.slideNumber) {
              yield { type: 'token', content: `Regenerating slide ${intent.slideNumber}...\n` };
              const result = await this.slideModifier.modifySlide(
                presentationId,
                intent.slideNumber,
                'Completely regenerate this slide with fresh content while keeping the same topic.',
              );
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
          // generate_outline and general_chat fall through to default behavior
        }
      }
    }

    // Regular chat — build context and stream LLM response
    yield* this.streamLlmResponse(userId, presentationId, content);
  }

  private async *streamLlmResponse(
    userId: string,
    presentationId: string,
    content: string,
  ): AsyncGenerator<ChatStreamEvent> {
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

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt + kbContext,
      },
      ...history,
    ];

    let fullResponse = '';
    for await (const chunk of this.llm.streamChat(messages)) {
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
        const format = args[0] || 'pptx';
        yield {
          type: 'action',
          content: `Starting export as ${format.toUpperCase()}...`,
          metadata: { action: 'export', format },
        };
        yield { type: 'done', content: '' };
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

  private detectGenerationIntent(content: string): GenerationConfig | null {
    const lower = content.toLowerCase();

    const generationTriggers = [
      'create a presentation',
      'create a deck',
      'create a pitch',
      'create a slide',
      'make a presentation',
      'make a deck',
      'make a pitch',
      'make slides',
      'generate a presentation',
      'generate a deck',
      'generate slides',
      'build a presentation',
      'build a deck',
      'build slides',
      'pitch deck about',
      'presentation about',
      'presentation on',
      'slides about',
      'slides on',
      'deck about',
      'deck on',
    ];

    const isGeneration = generationTriggers.some((trigger) => lower.includes(trigger));
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

  async getHistory(presentationId: string) {
    return this.prisma.chatMessage.findMany({
      where: { presentationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        messageType: true,
        metadata: true,
        createdAt: true,
      },
    });
  }
}
