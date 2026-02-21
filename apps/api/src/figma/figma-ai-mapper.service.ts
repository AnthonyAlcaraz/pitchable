import { Injectable, Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { LlmService, LlmModel } from '../chat/llm.service.js';
import type { FigmaFrameInfo } from './interfaces/figma-api.interfaces.js';
import { SlideType } from '../../generated/prisma/enums.js';

// ── Types ──────────────────────────────────────────────────

export interface FigmaFrameAnalysis {
  nodeId: string;
  name: string;
  slideType: string;
  confidence: number;
  layoutHint: string;
  reasoning: string;
}

interface AiClassificationResult {
  frames: Array<{
    nodeId: string;
    slideType: string;
    confidence: number;
    layoutHint: string;
    reasoning: string;
  }>;
}

// ── Keyword pre-filter (reused from figma-template.service) ──

const SLIDE_TYPE_KEYWORDS: Record<string, string[]> = {
  TITLE: ['title', 'cover', 'intro', 'hero'],
  PROBLEM: ['problem', 'pain', 'challenge'],
  SOLUTION: ['solution', 'answer', 'approach'],
  ARCHITECTURE: ['architecture', 'system', 'diagram', 'tech'],
  PROCESS: ['process', 'flow', 'steps', 'workflow'],
  COMPARISON: ['comparison', 'versus', 'vs', 'compare'],
  DATA_METRICS: ['data', 'metrics', 'numbers', 'stats', 'kpi'],
  CTA: ['cta', 'call to action', 'next steps', 'contact'],
  CONTENT: ['content', 'body', 'text', 'default'],
  QUOTE: ['quote', 'testimonial'],
  VISUAL_HUMOR: ['humor', 'fun', 'meme'],
  TEAM: ['team', 'people', 'founders'],
  TIMELINE: ['timeline', 'roadmap', 'milestones'],
  SECTION_DIVIDER: ['section', 'divider', 'break'],
  METRICS_HIGHLIGHT: ['highlight', 'featured'],
  FEATURE_GRID: ['features', 'grid', 'capabilities'],
  PRODUCT_SHOWCASE: ['product', 'showcase', 'demo'],
  LOGO_WALL: ['logos', 'partners', 'clients'],
  MARKET_SIZING: ['market', 'tam', 'sam'],
  SPLIT_STATEMENT: ['split', 'statement', 'big idea'],
};

/** All valid SlideType values for prompt and validation. */
const ALL_SLIDE_TYPES = Object.values(SlideType);

/** Minimum confidence to accept an AI classification. */
const MIN_CONFIDENCE = 0.6;

/** Max frames to include in a single vision call (to stay under token limits). */
const MAX_FRAMES_PER_BATCH = 8;

// ── Vision prompt ──────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are an expert presentation designer analyzing Figma frame thumbnails.

Your task: classify each frame into the most appropriate slide type based on its VISUAL LAYOUT, not just its name.

Available slide types with visual descriptions:
- TITLE: Large centered title text, minimal content, often with a background image or gradient
- PROBLEM: Pain point layout — bold headline with supporting evidence, often red/warning imagery
- SOLUTION: Answer/approach — hero section with key benefits or a product screenshot
- ARCHITECTURE: Technical diagram, system overview, boxes/arrows, flowchart-like layout
- PROCESS: Step-by-step flow, numbered steps, sequential layout with arrows/connectors
- COMPARISON: Side-by-side columns, before/after, pros/cons table layout
- DATA_METRICS: Charts, graphs, KPI numbers, data visualization, statistics dashboard
- CTA: Call-to-action, contact info, "let's talk" section, buttons, next steps
- CONTENT: General body text, bullet points, narrative content, mixed layout
- QUOTE: Large quotation marks, testimonial with attribution, centered italic text
- VISUAL_HUMOR: Full-screen image with minimal text overlay, humorous/casual tone
- TEAM: People grid, team photos, headshots with names/roles
- TIMELINE: Horizontal/vertical timeline, roadmap, milestone markers
- SECTION_DIVIDER: Minimal content, large text divider between sections
- METRICS_HIGHLIGHT: Featured single number/stat with context, hero metric
- FEATURE_GRID: Grid of feature icons/cards, capability matrix
- PRODUCT_SHOWCASE: Product screenshot/demo, device mockup, UI preview
- LOGO_WALL: Grid of partner/client logos
- MARKET_SIZING: TAM/SAM/SOM circles, market data, sizing chart
- SPLIT_STATEMENT: Bold statement on one side, supporting content on the other

For each frame, respond with:
- slideType: one of the types above
- confidence: 0.0-1.0 (how confident you are in the classification)
- layoutHint: brief description of the visual layout (e.g. "centered title over dark gradient")
- reasoning: one-sentence explanation of why you chose this type

Return a JSON object with a "frames" array containing one entry per input frame.
Each entry must include: nodeId, slideType, confidence, layoutHint, reasoning.`;

// ── Service ────────────────────────────────────────────────

@Injectable()
export class FigmaAiMapperService {
  private readonly logger = new Logger(FigmaAiMapperService.name);

  constructor(private readonly llm: LlmService) {}

  /**
   * Analyze Figma frames using keyword pre-filter + AI vision fallback.
   *
   * 1. Keyword match on frame names (free, catches obvious ones)
   * 2. For unmatched frames with thumbnails, use Sonnet 4.6 vision
   * 3. Return combined results with confidence scores
   */
  async analyzeFrames(
    frames: FigmaFrameInfo[],
    availableSlideTypes?: string[],
  ): Promise<FigmaFrameAnalysis[]> {
    const validTypes = new Set(availableSlideTypes ?? ALL_SLIDE_TYPES);
    const results: FigmaFrameAnalysis[] = [];
    const unmatchedFrames: FigmaFrameInfo[] = [];

    // Phase 1: keyword pre-filter
    for (const frame of frames) {
      const match = this.keywordMatch(frame.name, validTypes);
      if (match) {
        results.push({
          nodeId: frame.nodeId,
          name: frame.name,
          slideType: match,
          confidence: 0.9,
          layoutHint: 'keyword match',
          reasoning: `Frame name "${frame.name}" matched keyword for ${match}`,
        });
      } else {
        unmatchedFrames.push(frame);
      }
    }

    this.logger.log(
      `Keyword pre-filter: ${results.length} matched, ${unmatchedFrames.length} need AI analysis`,
    );

    // Phase 2: AI vision classification for unmatched frames
    if (unmatchedFrames.length > 0) {
      const aiResults = await this.classifyWithVision(unmatchedFrames, validTypes);
      results.push(...aiResults);
    }

    return results;
  }

  /**
   * Keyword match a frame name against known slide type keywords.
   */
  private keywordMatch(frameName: string, validTypes: Set<string>): string | null {
    const nameLower = frameName.toLowerCase();

    for (const [slideType, keywords] of Object.entries(SLIDE_TYPE_KEYWORDS)) {
      if (!validTypes.has(slideType)) continue;
      if (keywords.some((kw) => nameLower.includes(kw))) {
        return slideType;
      }
    }

    return null;
  }

  /**
   * Use Sonnet 4.6 vision to classify frames based on thumbnail images.
   * Batches up to MAX_FRAMES_PER_BATCH images per API call.
   */
  private async classifyWithVision(
    frames: FigmaFrameInfo[],
    validTypes: Set<string>,
  ): Promise<FigmaFrameAnalysis[]> {
    const results: FigmaFrameAnalysis[] = [];

    // Filter to frames that have thumbnailUrls
    const framesWithThumbnails = frames.filter((f) => f.thumbnailUrl);
    const framesWithoutThumbnails = frames.filter((f) => !f.thumbnailUrl);

    // Frames without thumbnails get CONTENT as fallback
    for (const frame of framesWithoutThumbnails) {
      results.push({
        nodeId: frame.nodeId,
        name: frame.name,
        slideType: 'CONTENT',
        confidence: 0.3,
        layoutHint: 'no thumbnail available',
        reasoning: 'No thumbnail URL — defaulting to CONTENT',
      });
    }

    // Process in batches
    for (let i = 0; i < framesWithThumbnails.length; i += MAX_FRAMES_PER_BATCH) {
      const batch = framesWithThumbnails.slice(i, i + MAX_FRAMES_PER_BATCH);
      try {
        const batchResults = await this.classifyBatch(batch, validTypes);
        results.push(...batchResults);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`AI vision classification failed for batch: ${msg}`);

        // Fallback: mark as CONTENT with low confidence
        for (const frame of batch) {
          results.push({
            nodeId: frame.nodeId,
            name: frame.name,
            slideType: 'CONTENT',
            confidence: 0.3,
            layoutHint: 'ai classification failed',
            reasoning: `Vision analysis error: ${msg}`,
          });
        }
      }
    }

    return results;
  }

  /**
   * Classify a single batch of frames (up to 8) via one Sonnet 4.6 vision call.
   */
  private async classifyBatch(
    batch: FigmaFrameInfo[],
    validTypes: Set<string>,
  ): Promise<FigmaFrameAnalysis[]> {
    // Build content blocks: text description + images
    const contentBlocks: Array<Anthropic.ContentBlockParam> = [];

    // Opening text block listing the frames
    const frameList = batch
      .map((f, i) => `Frame ${i + 1}: nodeId="${f.nodeId}", name="${f.name}", size=${f.width}x${f.height}`)
      .join('\n');
    contentBlocks.push({
      type: 'text',
      text: `Classify the following ${batch.length} Figma frames. Each image below corresponds to the frame listed in order.\n\n${frameList}`,
    });

    // Download thumbnails and add as base64 image blocks
    for (const frame of batch) {
      if (!frame.thumbnailUrl) continue;

      try {
        const base64 = await this.downloadAsBase64(frame.thumbnailUrl);
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64,
          },
        });
        contentBlocks.push({
          type: 'text',
          text: `(Image above is frame: "${frame.name}", nodeId: "${frame.nodeId}")`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'download failed';
        this.logger.warn(`Failed to download thumbnail for frame "${frame.name}": ${msg}`);
        contentBlocks.push({
          type: 'text',
          text: `(Could not load image for frame: "${frame.name}", nodeId: "${frame.nodeId}" — classify based on name only)`,
        });
      }
    }

    // Call vision LLM
    const validator = (data: unknown): data is AiClassificationResult => {
      if (!data || typeof data !== 'object') return false;
      const obj = data as Record<string, unknown>;
      if (!Array.isArray(obj.frames)) return false;
      return obj.frames.every(
        (f: unknown) =>
          f &&
          typeof f === 'object' &&
          typeof (f as Record<string, unknown>).nodeId === 'string' &&
          typeof (f as Record<string, unknown>).slideType === 'string' &&
          typeof (f as Record<string, unknown>).confidence === 'number',
      );
    };

    const result = await this.llm.completeJsonVision<AiClassificationResult>(
      VISION_SYSTEM_PROMPT,
      contentBlocks,
      LlmModel.SONNET,
      validator,
      1,
    );

    // Map results back to FigmaFrameAnalysis, validating slideType
    return result.frames.map((aiFrame) => {
      const frame = batch.find((f) => f.nodeId === aiFrame.nodeId);
      const slideType = validTypes.has(aiFrame.slideType) ? aiFrame.slideType : 'CONTENT';
      const confidence = Math.max(0, Math.min(1, aiFrame.confidence));

      return {
        nodeId: aiFrame.nodeId,
        name: frame?.name ?? aiFrame.nodeId,
        slideType,
        confidence,
        layoutHint: aiFrame.layoutHint ?? '',
        reasoning: aiFrame.reasoning ?? '',
      };
    });
  }

  /**
   * Download a URL and return its content as base64.
   */
  private async downloadAsBase64(url: string): Promise<string> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} downloading thumbnail`);
    }

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
