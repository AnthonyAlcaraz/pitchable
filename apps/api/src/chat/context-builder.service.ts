import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service.js';
import { buildFeedbackInjection } from './prompts/feedback-injection.prompt.js';
import type { FeedbackData } from './prompts/feedback-injection.prompt.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KnowledgeBaseService,
  ) {}

  async buildSystemPrompt(
    userId: string,
    presentationId: string,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      'You are Pitchable, an AI presentation co-pilot. You help users create, iterate, and refine slide decks through conversation.',
      'You generate structured slide content following strict design constraints: max 6 bullet points per slide, max 80 words per slide, 1 key concept per slide.',
      'Always respond concisely and actionably.',
    );

    // Deck state context
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        slides: { orderBy: { slideNumber: 'asc' }, select: { slideNumber: true, title: true, slideType: true, body: true } },
        theme: { select: { name: true, displayName: true } },
      },
    });

    if (presentation) {
      parts.push(
        `\nCurrent presentation: "${presentation.title}"`,
        `Type: ${presentation.presentationType}`,
        `Theme: ${presentation.theme.displayName}`,
        `Status: ${presentation.status}`,
      );

      if (presentation.slides.length > 0) {
        parts.push(`\nCurrent slides (${presentation.slides.length}):`);
        for (const s of presentation.slides) {
          const preview = s.body.slice(0, 100).replace(/\n/g, ' ');
          parts.push(`  ${s.slideNumber}. [${s.slideType}] ${s.title} — ${preview}...`);
        }
      } else {
        parts.push('\nNo slides yet. The user may ask to generate an outline or create slides.');
      }
    }

    // Feedback injection (user preferences from past corrections + codified rules)
    const feedbackData = await this.getUserFeedbackData(userId);
    const feedbackBlock = buildFeedbackInjection(
      feedbackData.rules,
      feedbackData.corrections,
    );
    if (feedbackBlock) {
      parts.push(feedbackBlock);
    }

    return parts.join('\n');
  }

  async retrieveKbContext(
    userId: string,
    query: string,
    limit = 10,
  ): Promise<string> {
    try {
      const results = await this.kbService.search(userId, query, limit, 0.3);
      if (results.length === 0) return '';

      const parts = ['\nRelevant knowledge base content:'];
      for (const r of results) {
        parts.push(`---\n${r.content}\n(source: ${r.documentTitle}, similarity: ${r.similarity.toFixed(2)})`);
      }
      return parts.join('\n');
    } catch (err) {
      this.logger.warn(`KB retrieval failed: ${err}`);
      return '';
    }
  }

  async buildChatHistory(
    presentationId: string,
    limit = 20,
  ): Promise<ChatCompletionMessageParam[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { presentationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true },
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * Get user's feedback data (rules + recent corrections) for injection.
   */
  async getUserFeedbackData(userId: string): Promise<FeedbackData> {
    const rules = await this.prisma.feedbackEntry.findMany({
      where: { userId, type: 'RULE' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { rule: true, category: true },
    });

    // Fetch recent corrections, then deduplicate: keep only 1 per category
    const corrections = await this.prisma.feedbackEntry.findMany({
      where: { userId, type: 'CORRECTION' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { originalContent: true, correctedContent: true, category: true },
    });

    const seenCategories = new Set<string>();
    const dedupedCorrections = corrections
      .filter((c) => c.originalContent && c.correctedContent)
      .filter((c) => {
        if (seenCategories.has(c.category)) return false;
        seenCategories.add(c.category);
        return true;
      });

    return {
      rules: rules
        .filter((r): r is { category: string; rule: string } => r.rule !== null)
        .map((r) => ({ category: r.category, rule: r.rule })),
      corrections: dedupedCorrections.map((c) => ({
        category: c.category,
        original: c.originalContent!,
        corrected: c.correctedContent!,
      })),
    };
  }

  /**
   * Build a feedback-enriched system prompt string for generation.
   */
  async buildFeedbackBlock(userId: string): Promise<string> {
    const data = await this.getUserFeedbackData(userId);
    return buildFeedbackInjection(data.rules, data.corrections);
  }
}
