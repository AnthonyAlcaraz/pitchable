import { Injectable } from '@nestjs/common';

// ── Interfaces ──────────────────────────────────────────────

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface ImagePrompt {
  prompt: string;
  negativePrompt: string;
  aspectRatio: '16:9';
  style: string;
}

const NEGATIVE_PROMPT =
  'text, words, labels, numbers, letters, watermark, low quality, blurry, cartoon, anime, photorealistic faces, hands';

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ImagePromptBuilderService {
  buildPrompt(
    slideType: string,
    slideTitle: string,
    slideBody: string,
    theme: ThemeColors,
  ): ImagePrompt {
    switch (slideType) {
      case 'TITLE':
        return this.buildTitlePrompt(slideTitle, theme);
      case 'PROBLEM':
        return this.buildProblemPrompt(slideTitle, slideBody, theme);
      case 'SOLUTION':
        return this.buildSolutionPrompt(slideTitle, slideBody, theme);
      case 'ARCHITECTURE':
        return this.buildArchitecturePrompt(slideTitle, slideBody, theme);
      case 'DATA_METRICS':
        return this.buildDataPrompt(slideTitle, slideBody, theme);
      case 'CTA':
        return this.buildCTAPrompt(slideTitle, theme);
      default:
        return this.buildGenericPrompt(slideTitle, slideBody, theme);
    }
  }

  buildTitlePrompt(title: string, theme: ThemeColors): ImagePrompt {
    const condensed = this.condenseTitle(title);
    return {
      prompt:
        `Clean conceptual diagram with central node labeled ${condensed}. ` +
        `Radiating branches showing key pillars. ` +
        `${theme.backgroundColor} background, ${theme.primaryColor} color scheme. ` +
        `Modern SaaS aesthetic, Apple keynote style. Professional, presentation-ready.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'conceptual-diagram',
    };
  }

  buildProblemPrompt(
    title: string,
    body: string,
    theme: ThemeColors,
  ): ImagePrompt {
    return {
      prompt:
        `Conceptual diagram showing fragmentation and disconnection. ` +
        `Scattered boxes, broken arrows, silos. ` +
        `Muted grays with warning orange highlights. ` +
        `Clean but showing problems. Professional infographic style.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'problem-visualization',
    };
  }

  buildSolutionPrompt(
    title: string,
    body: string,
    theme: ThemeColors,
  ): ImagePrompt {
    return {
      prompt:
        `Conceptual diagram showing integration and unity. ` +
        `Connected components, flowing arrows, unified system. ` +
        `${theme.primaryColor} and green tones. ` +
        `Clean white or dark background. Modern SaaS documentation style.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'solution-visualization',
    };
  }

  buildArchitecturePrompt(
    title: string,
    body: string,
    theme: ThemeColors,
  ): ImagePrompt {
    return {
      prompt:
        `Clean 3-layer architecture diagram. ` +
        `Top layer 'Application', middle layer 'Services', bottom layer 'Data'. ` +
        `Vertical arrows connecting layers. ` +
        `${theme.backgroundColor} background, ${theme.primaryColor} color scheme. ` +
        `Technical documentation style, isometric perspective.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'architecture-diagram',
    };
  }

  buildDataPrompt(
    title: string,
    body: string,
    theme: ThemeColors,
  ): ImagePrompt {
    return {
      prompt:
        `Abstract data visualization with rising geometric shapes. ` +
        `Clean bars, nodes, flow elements. ` +
        `${theme.primaryColor} electric glow on dark background. ` +
        `Bloomberg terminal aesthetic, professional data viz.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'data-visualization',
    };
  }

  buildCTAPrompt(title: string, theme: ThemeColors): ImagePrompt {
    return {
      prompt:
        `Inspirational visualization with upward momentum. ` +
        `Converging arrows, ascending geometric forms, bright focal point. ` +
        `${theme.accentColor} highlights on ${theme.backgroundColor}. ` +
        `Optimistic, forward-looking, professional.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'call-to-action',
    };
  }

  buildGenericPrompt(
    title: string,
    body: string,
    theme: ThemeColors,
  ): ImagePrompt {
    const concept = this.condenseTitle(title);
    return {
      prompt:
        `Clean professional infographic visualizing ${concept}. ` +
        `Minimal elements, clear hierarchy. ` +
        `${theme.primaryColor} on ${theme.backgroundColor}. ` +
        `Modern presentation visual.`,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '16:9',
      style: 'generic-infographic',
    };
  }

  // ── Private Helpers ─────────────────────────────────────────

  private condenseTitle(title: string): string {
    // Strip common filler words and truncate to a concise concept
    const fillerWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'and',
      'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    ]);

    const words = title
      .split(/\s+/)
      .filter((w) => !fillerWords.has(w.toLowerCase()))
      .slice(0, 5);

    return words.join(' ') || title;
  }
}
