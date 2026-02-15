import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service.js';
import { EdgeQuakeService } from '../knowledge-base/edgequake/edgequake.service.js';
import { OmnisearchService } from '../knowledge-base/omnisearch.service.js';
import { buildFeedbackInjection } from './prompts/feedback-injection.prompt.js';
import type { FeedbackData } from './prompts/feedback-injection.prompt.js';
import { buildPitchLensInjection } from '../pitch-lens/prompts/pitch-lens-injection.prompt.js';
import { getFrameworkConfig } from '../pitch-lens/frameworks/story-frameworks.config.js';
import type { LlmMessage } from './llm.service.js';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KnowledgeBaseService,
    private readonly edgequake: EdgeQuakeService,
    private readonly omnisearch: OmnisearchService,
  ) {}

  async buildSystemPrompt(
    userId: string,
    presentationId: string,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      'You are Pitchable, an AI presentation co-pilot. You ONLY help users create, iterate, and refine slide decks through conversation.',
      'You generate structured slide content following strict design constraints: max 6 bullet points per slide, max 80 words per slide, 1 key concept per slide.',
      'Always respond concisely and actionably.',
      '',
      'CRITICAL SCOPE RULE: You exclusively help with presentation tasks — creating decks, editing slides, structuring content, choosing themes, and presentation best practices.',
      'If a user asks anything unrelated to presentations (coding, math, general knowledge, personal advice, creative writing, translation, etc.), respond ONLY with:',
      '"I\'m focused on helping you build great presentations. What would you like to work on for your deck?"',
      'Never act as a general-purpose assistant. Never answer off-topic questions even if you know the answer.',
    );

    // Deck state context
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        slides: { orderBy: { slideNumber: 'asc' }, select: { slideNumber: true, title: true, slideType: true, body: true } },
        theme: { select: { name: true, displayName: true } },
        pitchLens: true,
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

    // Pitch Lens injection (storytelling framework, tone, audience guidance)
    if (presentation?.pitchLens) {
      const framework = getFrameworkConfig(presentation.pitchLens.selectedFramework);
      const lensBlock = buildPitchLensInjection({
        ...presentation.pitchLens,
        framework,
      });
      parts.push(lensBlock);
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

  /**
   * Retrieve KB context scoped to a specific Pitch Brief's EdgeQuake workspace.
   */
  async retrieveBriefContext(
    userId: string,
    briefId: string,
    query: string,
    limit = 10,
  ): Promise<string> {
    try {
      const brief = await this.prisma.pitchBrief.findUnique({
        where: { id: briefId },
        select: { edgequakeWorkspaceId: true },
      });
      if (!brief?.edgequakeWorkspaceId || !this.edgequake.isEnabled()) {
        return this.retrieveKbContext(userId, query, limit);
      }

      const mapping = await this.prisma.edgeQuakeMapping.findUnique({
        where: { userId },
      });
      if (!mapping) {
        return this.retrieveKbContext(userId, query, limit);
      }

      const result = await this.edgequake.query(
        mapping.tenantId,
        brief.edgequakeWorkspaceId,
        query,
        'hybrid',
      );

      if (!result.sources || result.sources.length === 0) return '';

      const parts = ['\nRelevant knowledge base content (from Pitch Brief):'];
      for (const s of result.sources.slice(0, limit)) {
        parts.push(`---\n${s.content}\n(score: ${s.score.toFixed(2)})`);
      }
      return parts.join('\n');
    } catch (err) {
      this.logger.warn(`Brief context retrieval failed, falling back to global KB: ${err}`);
      return this.retrieveKbContext(userId, query, limit);
    }
  }

  /**
   * Retrieve Omnisearch vault context for a query.
   * Runs multiple keyword searches sequentially (Omnisearch is single-threaded).
   */
  async retrieveOmnisearchContext(
    query: string,
    limit = 5,
  ): Promise<string> {
    if (!this.omnisearch.isEnabled) return '';

    try {
      // Extract key terms for multi-query search (Z4 pattern)
      const keywords = this.extractSearchKeywords(query);
      const queries = [query, ...keywords].slice(0, 4);

      const results = await this.omnisearch.multiSearch(queries, Math.ceil(limit / queries.length));
      return this.omnisearch.formatAsContext(results.slice(0, limit));
    } catch (err) {
      this.logger.warn(`Omnisearch retrieval failed: ${err}`);
      return '';
    }
  }

  /**
   * Retrieve enriched context: KB (pgvector) + Omnisearch (vault).
   * Falls back gracefully if either source is unavailable.
   * Mirrors Z4's vault search → evidence database pattern.
   */
  async retrieveEnrichedContext(
    userId: string,
    query: string,
    kbLimit = 5,
    omnisearchLimit = 5,
  ): Promise<string> {
    const [kbContext, vaultContext] = await Promise.all([
      this.retrieveKbContext(userId, query, kbLimit),
      this.retrieveOmnisearchContext(query, omnisearchLimit),
    ]);

    const parts: string[] = [];
    if (kbContext) parts.push(kbContext);
    if (vaultContext) parts.push(vaultContext);
    return parts.join('\n');
  }

  /**
   * Retrieve per-slide KB context: searches with both the slide title
   * and the bullet points as queries for maximum relevance.
   * Returns context specifically relevant to a single slide's content.
   */
  async retrieveSlideContext(
    userId: string,
    slideTitle: string,
    bulletPoints: string[],
    kbLimit = 3,
    omnisearchLimit = 3,
  ): Promise<string> {
    // Build focused queries from the slide content
    const queries = [
      slideTitle,
      ...bulletPoints.filter((b) => b.length > 10).slice(0, 2),
    ];

    const allResults: string[] = [];

    for (const query of queries) {
      const [kb, vault] = await Promise.all([
        this.retrieveKbContext(userId, query, kbLimit),
        this.retrieveOmnisearchContext(query, omnisearchLimit),
      ]);
      if (kb) allResults.push(kb);
      if (vault) allResults.push(vault);
    }

    // Deduplicate by checking for content overlap
    const seen = new Set<string>();
    const deduped = allResults.filter((r) => {
      const key = r.slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.join('\n');
  }

  /**
   * Extract key search terms from a query string.
   * Removes common filler words, returns top concept phrases.
   */
  private extractSearchKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'and', 'or',
      'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about',
      'that', 'this', 'these', 'those', 'be', 'been', 'has', 'have', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might',
      'not', 'no', 'so', 'if', 'then', 'than', 'when', 'how', 'what', 'which',
      'slide', 'slides', 'presentation', 'content', 'create', 'make', 'add',
    ]);

    const words = query
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

    // Build 2-3 word phrase queries from consecutive significant words
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i += 2) {
      const phrase = words.slice(i, i + 3).join(' ');
      if (phrase.length > 5) phrases.push(phrase);
    }

    return phrases.slice(0, 3);
  }

  async buildChatHistory(
    presentationId: string,
    limit = 20,
  ): Promise<LlmMessage[]> {
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
