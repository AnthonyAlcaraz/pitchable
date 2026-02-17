import { Injectable } from '@nestjs/common';
import { SlideType } from '../../generated/prisma/enums.js';
import type { ParsedContent, ParsedSection } from './content-parser.service.js';

// ── Interfaces ──────────────────────────────────────────────

export interface SlideDefinition {
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string;
  slideType: SlideType;
  imagePromptHint: string;
}

// ── Constants ───────────────────────────────────────────────

/** Maximum words per slide body before triggering a split. */
const MAX_WORDS_PER_SLIDE = 80;

/** Maximum bullet points per slide before triggering a split. */
const MAX_BULLETS_PER_SLIDE = 5;

/** Maps SectionType to the Prisma SlideType. */
const SECTION_TO_SLIDE_TYPE: Record<string, SlideType> = {
  introduction: SlideType.CONTENT,
  problem: SlideType.PROBLEM,
  solution: SlideType.SOLUTION,
  data: SlideType.DATA_METRICS,
  quote: SlideType.QUOTE,
  process: SlideType.PROCESS,
  comparison: SlideType.COMPARISON,
  conclusion: SlideType.CTA,
};

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class SlideStructurerService {
  /**
   * Convert parsed content into an ordered list of slide definitions.
   * Structure varies by presentation type.
   */
  structureSlides(
    parsed: ParsedContent,
    presentationType: string,
  ): SlideDefinition[] {
    switch (presentationType) {
      case 'VC_PITCH':
        return this.structureVcPitch(parsed);
      case 'TECHNICAL':
        return this.structureTechnical(parsed);
      case 'EXECUTIVE':
        return this.structureExecutive(parsed);
      case 'STANDARD':
      default:
        return this.structureStandard(parsed);
    }
  }

  /**
   * Build a title slide.
   */
  buildTitleSlide(title: string, subtitle?: string): SlideDefinition {
    const body = subtitle ?? '';
    return {
      slideNumber: 1,
      title,
      body,
      speakerNotes: `Welcome to the presentation: ${title}. ${subtitle ?? ''}`.trim(),
      slideType: SlideType.TITLE,
      imagePromptHint: `Professional title slide background for a presentation about: ${title}`,
    };
  }

  /**
   * Build a content slide from a parsed section.
   */
  buildContentSlide(section: ParsedSection, slideNumber: number): SlideDefinition {
    const slideType = SECTION_TO_SLIDE_TYPE[section.type] ?? SlideType.CONTENT;

    // Build body from bullet points if available, otherwise use raw body
    const body = section.bulletPoints.length > 0
      ? section.bulletPoints.map((bp) => `- ${bp}`).join('\n')
      : section.body;

    // Build speaker notes from the full section body
    const speakerNotes = this.buildSpeakerNotes(section);

    // Build image prompt hint based on section type and content
    const imagePromptHint = this.buildImagePromptHint(section);

    return {
      slideNumber,
      title: section.heading,
      body,
      speakerNotes,
      slideType,
      imagePromptHint,
    };
  }

  /**
   * Build a call-to-action / closing slide.
   */
  buildCTASlide(content: ParsedContent): SlideDefinition {
    // Look for a conclusion section
    const conclusionSection = content.sections.find(
      (s) => s.type === 'conclusion',
    );

    const title = conclusionSection?.heading ?? 'Next Steps';

    const body = conclusionSection
      ? conclusionSection.bulletPoints.length > 0
        ? conclusionSection.bulletPoints.map((bp) => `- ${bp}`).join('\n')
        : conclusionSection.body
      : 'Thank you for your time.\n\nQuestions?';

    return {
      slideNumber: 0, // Will be set by caller
      title,
      body,
      speakerNotes: 'Wrap up the presentation. Open the floor for questions and discussion.',
      slideType: SlideType.CTA,
      imagePromptHint: 'Professional closing slide with call to action, clean and minimal design',
    };
  }

  // ── Presentation Type Structures ──────────────────────────

  /**
   * STANDARD: title, overview, content slides, conclusion.
   * Target: 8-16 slides.
   */
  private structureStandard(parsed: ParsedContent): SlideDefinition[] {
    const slides: SlideDefinition[] = [];
    let slideNum = 1;

    // Title slide
    slides.push(this.buildTitleSlide(parsed.title, 'Overview'));
    slideNum++;

    // Overview slide if multiple sections
    if (parsed.sections.length > 2) {
      slides.push({
        slideNumber: slideNum++,
        title: 'Agenda',
        body: parsed.sections
          .filter((s) => s.type !== 'conclusion')
          .map((s) => `- ${s.heading}`)
          .join('\n'),
        speakerNotes: 'Walk through the agenda items for this presentation.',
        slideType: SlideType.CONTENT,
        imagePromptHint: 'Clean agenda or table of contents slide with numbered items',
      });
    }

    // Content slides from sections (excluding any that became the conclusion)
    const contentSections = parsed.sections.filter((s) => s.type !== 'conclusion');
    for (const section of contentSections) {
      const sectionSlides = this.buildSectionSlides(section, slideNum);
      slides.push(...sectionSlides);
      slideNum += sectionSlides.length;
    }

    // CTA / conclusion
    const ctaSlide = this.buildCTASlide(parsed);
    ctaSlide.slideNumber = slideNum;
    slides.push(ctaSlide);

    return this.enforceSlideRange(slides, 8, 16);
  }

  /**
   * VC_PITCH: title, problem, solution, market size, traction, team, ask.
   * Target: 10-14 slides.
   */
  private structureVcPitch(parsed: ParsedContent): SlideDefinition[] {
    const slides: SlideDefinition[] = [];
    let slideNum = 1;

    // Title
    slides.push(this.buildTitleSlide(parsed.title, 'Investor Pitch'));
    slideNum++;

    // Required VC sections in order
    const vcSectionOrder: Array<{ type: string; fallbackTitle: string; fallbackBody: string }> = [
      {
        type: 'problem',
        fallbackTitle: 'The Problem',
        fallbackBody: 'A significant market pain point that needs solving.',
      },
      {
        type: 'solution',
        fallbackTitle: 'Our Solution',
        fallbackBody: 'Our unique approach to solving this problem.',
      },
      {
        type: 'data',
        fallbackTitle: 'Market Opportunity',
        fallbackBody: 'Total addressable market and growth trajectory.',
      },
    ];

    for (const vc of vcSectionOrder) {
      const matchedSection = parsed.sections.find((s) => s.type === vc.type);
      if (matchedSection) {
        const sectionSlides = this.buildSectionSlides(matchedSection, slideNum);
        slides.push(...sectionSlides);
        slideNum += sectionSlides.length;
      } else {
        slides.push({
          slideNumber: slideNum++,
          title: vc.fallbackTitle,
          body: vc.fallbackBody,
          speakerNotes: `Discuss: ${vc.fallbackTitle}`,
          slideType: SECTION_TO_SLIDE_TYPE[vc.type] ?? SlideType.CONTENT,
          imagePromptHint: `Business presentation slide about ${vc.fallbackTitle.toLowerCase()}`,
        });
      }
    }

    // Remaining content sections not yet covered
    const coveredTypes = new Set(vcSectionOrder.map((v) => v.type));
    coveredTypes.add('conclusion');
    const remaining = parsed.sections.filter((s) => !coveredTypes.has(s.type));

    for (const section of remaining) {
      const sectionSlides = this.buildSectionSlides(section, slideNum);
      slides.push(...sectionSlides);
      slideNum += sectionSlides.length;
    }

    // The Ask / CTA
    const ctaSlide = this.buildCTASlide(parsed);
    ctaSlide.slideNumber = slideNum;
    ctaSlide.title = ctaSlide.title === 'Next Steps' ? 'The Ask' : ctaSlide.title;
    slides.push(ctaSlide);

    return this.enforceSlideRange(slides, 10, 14);
  }

  /**
   * TECHNICAL: title, context, architecture, deep-dive slides, demo, Q&A.
   * Target: 12-18 slides.
   */
  private structureTechnical(parsed: ParsedContent): SlideDefinition[] {
    const slides: SlideDefinition[] = [];
    let slideNum = 1;

    // Title
    slides.push(this.buildTitleSlide(parsed.title, 'Technical Deep Dive'));
    slideNum++;

    // Context / background
    const introSection = parsed.sections.find((s) => s.type === 'introduction');
    if (introSection) {
      slides.push(this.buildContentSlide(introSection, slideNum++));
    } else {
      slides.push({
        slideNumber: slideNum++,
        title: 'Context',
        body: 'Technical background and motivation for this work.',
        speakerNotes: 'Set the technical context for the audience.',
        slideType: SlideType.CONTENT,
        imagePromptHint: 'Technical context diagram, system overview, clean blueprint style',
      });
    }

    // Architecture slide
    const archSection = parsed.sections.find(
      (s) => s.heading.toLowerCase().includes('architecture') ||
             s.heading.toLowerCase().includes('design') ||
             s.type === 'process',
    );
    if (archSection) {
      const archSlide = this.buildContentSlide(archSection, slideNum++);
      archSlide.slideType = SlideType.ARCHITECTURE;
      slides.push(archSlide);
    } else {
      slides.push({
        slideNumber: slideNum++,
        title: 'Architecture',
        body: 'System architecture and design decisions.',
        speakerNotes: 'Walk through the high-level architecture.',
        slideType: SlideType.ARCHITECTURE,
        imagePromptHint: 'System architecture diagram, boxes and arrows, technical blueprint',
      });
    }

    // Deep-dive content slides
    const coveredSections = new Set<ParsedSection>();
    if (introSection) coveredSections.add(introSection);
    if (archSection) coveredSections.add(archSection);

    const deepDiveSections = parsed.sections.filter(
      (s) => !coveredSections.has(s) && s.type !== 'conclusion',
    );

    for (const section of deepDiveSections) {
      const sectionSlides = this.buildSectionSlides(section, slideNum);
      slides.push(...sectionSlides);
      slideNum += sectionSlides.length;
    }

    // Demo slide
    slides.push({
      slideNumber: slideNum++,
      title: 'Demo',
      body: 'Live demonstration of the system in action.',
      speakerNotes: 'Run the prepared demo. Have fallback screenshots ready.',
      slideType: SlideType.CONTENT,
      imagePromptHint: 'Demo or live coding screenshot placeholder, terminal and code editor',
    });

    // Q&A slide
    const ctaSlide = this.buildCTASlide(parsed);
    ctaSlide.slideNumber = slideNum;
    ctaSlide.title = 'Q&A';
    ctaSlide.body = 'Questions and Discussion';
    slides.push(ctaSlide);

    return this.enforceSlideRange(slides, 12, 18);
  }

  /**
   * EXECUTIVE: title, executive summary, key findings, recommendations, next steps.
   * Target: 8-12 slides.
   */
  private structureExecutive(parsed: ParsedContent): SlideDefinition[] {
    const slides: SlideDefinition[] = [];
    let slideNum = 1;

    // Title
    slides.push(this.buildTitleSlide(parsed.title, 'Executive Briefing'));
    slideNum++;

    // Executive summary - synthesize from all sections
    const summaryBody = parsed.sections
      .slice(0, 3)
      .map((s) => `**${s.heading}:** ${this.truncateToSentence(s.body, 30)}`)
      .join('\n\n');

    slides.push({
      slideNumber: slideNum++,
      title: 'Executive Summary',
      body: summaryBody || 'Key findings and recommendations at a glance.',
      speakerNotes: 'High-level overview of the key points. Details follow.',
      slideType: SlideType.CONTENT,
      imagePromptHint: 'Executive summary dashboard, clean KPI cards, professional design',
    });

    // Key findings from data/problem sections
    const findingsSections = parsed.sections.filter(
      (s) => s.type === 'data' || s.type === 'problem' || s.type === 'comparison',
    );

    if (findingsSections.length > 0) {
      for (const section of findingsSections) {
        const sectionSlides = this.buildSectionSlides(section, slideNum);
        slides.push(...sectionSlides);
        slideNum += sectionSlides.length;
      }
    } else {
      slides.push({
        slideNumber: slideNum++,
        title: 'Key Findings',
        body: 'Analysis results and critical observations.',
        speakerNotes: 'Present the core findings that drive the recommendations.',
        slideType: SlideType.DATA_METRICS,
        imagePromptHint: 'Data visualization, charts and graphs, executive dashboard',
      });
    }

    // Recommendations from solution sections
    const recSections = parsed.sections.filter(
      (s) => s.type === 'solution' || s.type === 'process',
    );

    if (recSections.length > 0) {
      for (const section of recSections) {
        const sectionSlides = this.buildSectionSlides(section, slideNum);
        // Override slide type to CONTENT for exec style
        for (const slide of sectionSlides) {
          slide.title = slide.title.includes('Recommendation')
            ? slide.title
            : `Recommendation: ${slide.title}`;
        }
        slides.push(...sectionSlides);
        slideNum += sectionSlides.length;
      }
    } else {
      slides.push({
        slideNumber: slideNum++,
        title: 'Recommendations',
        body: 'Proposed actions based on the findings.',
        speakerNotes: 'Walk through each recommendation and its expected impact.',
        slideType: SlideType.CONTENT,
        imagePromptHint: 'Strategic recommendations, roadmap or action plan visual',
      });
    }

    // Remaining sections not yet covered
    const coveredTypes = new Set(['data', 'problem', 'comparison', 'solution', 'process', 'conclusion']);
    const uncovered = parsed.sections.filter(
      (s) => !coveredTypes.has(s.type),
    );
    for (const section of uncovered) {
      const sectionSlides = this.buildSectionSlides(section, slideNum);
      slides.push(...sectionSlides);
      slideNum += sectionSlides.length;
    }

    // Next steps
    const ctaSlide = this.buildCTASlide(parsed);
    ctaSlide.slideNumber = slideNum;
    ctaSlide.title = 'Next Steps';
    slides.push(ctaSlide);

    return this.enforceSlideRange(slides, 8, 12);
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Build one or more slides from a section, automatically splitting
   * dense content that exceeds density limits.
   */
  private buildSectionSlides(
    section: ParsedSection,
    startNumber: number,
  ): SlideDefinition[] {
    const baseSlide = this.buildContentSlide(section, startNumber);

    // VISUAL_HUMOR slides are intentionally minimal — never split
    if (baseSlide.slideType === SlideType.VISUAL_HUMOR) {
      return [baseSlide];
    }

    // Check density: too many bullets?
    if (section.bulletPoints.length > MAX_BULLETS_PER_SLIDE) {
      return this.splitByBullets(section, startNumber);
    }

    // Check density: too many words?
    const wordCount = this.countWords(baseSlide.body);
    if (wordCount > MAX_WORDS_PER_SLIDE) {
      return this.splitByWordCount(section, startNumber);
    }

    return [baseSlide];
  }

  /**
   * Split a section into multiple slides based on bullet point count.
   */
  private splitByBullets(
    section: ParsedSection,
    startNumber: number,
  ): SlideDefinition[] {
    const slides: SlideDefinition[] = [];
    const chunks = this.chunkArray(section.bulletPoints, MAX_BULLETS_PER_SLIDE);
    const slideType = SECTION_TO_SLIDE_TYPE[section.type] ?? SlideType.CONTENT;

    for (let i = 0; i < chunks.length; i++) {
      const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
      slides.push({
        slideNumber: startNumber + i,
        title: `${section.heading}${suffix}`,
        body: chunks[i].map((bp) => `- ${bp}`).join('\n'),
        speakerNotes: this.buildSpeakerNotes(section),
        slideType,
        imagePromptHint: this.buildImagePromptHint(section),
      });
    }

    return slides;
  }

  /**
   * Split a section into multiple slides when word count exceeds the limit.
   * Splits by sentences into roughly equal halves.
   */
  private splitByWordCount(
    section: ParsedSection,
    startNumber: number,
  ): SlideDefinition[] {
    const sentences = section.body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length <= 1) {
      return [this.buildContentSlide(section, startNumber)];
    }

    const mid = Math.ceil(sentences.length / 2);
    const slideType = SECTION_TO_SLIDE_TYPE[section.type] ?? SlideType.CONTENT;

    return [
      {
        slideNumber: startNumber,
        title: `${section.heading} (1/2)`,
        body: sentences.slice(0, mid).join(' '),
        speakerNotes: this.buildSpeakerNotes(section),
        slideType,
        imagePromptHint: this.buildImagePromptHint(section),
      },
      {
        slideNumber: startNumber + 1,
        title: `${section.heading} (2/2)`,
        body: sentences.slice(mid).join(' '),
        speakerNotes: 'Continue from previous slide.',
        slideType,
        imagePromptHint: this.buildImagePromptHint(section),
      },
    ];
  }

  /**
   * Build speaker notes from a section's full content.
   */
  private buildSpeakerNotes(section: ParsedSection): string {
    const parts: string[] = [];

    parts.push(`Key topic: ${section.heading}.`);

    if (section.statistics.length > 0) {
      parts.push(`Key statistics: ${section.statistics.join(', ')}.`);
    }

    if (section.quotes.length > 0) {
      parts.push(`Notable quote: "${section.quotes[0]}".`);
    }

    // Add the raw body as reference, truncated
    const bodyPreview = this.truncateToSentence(section.body, 50);
    if (bodyPreview.length > 0) {
      parts.push(`Details: ${bodyPreview}`);
    }

    return parts.join(' ');
  }

  /**
   * Build an image generation prompt hint based on section type and content.
   */
  private buildImagePromptHint(section: ParsedSection): string {
    const typeHints: Record<string, string> = {
      introduction: 'Professional opening visual, abstract shapes, clean design',
      problem: 'Visual metaphor for challenge or obstacle, dramatic lighting',
      solution: 'Innovation and technology visual, bright and optimistic',
      data: 'Data visualization, charts, graphs, dashboard aesthetic',
      quote: 'Inspirational quote background, subtle texture, elegant typography space',
      process: 'Workflow diagram, connected steps, process flow visualization',
      comparison: 'Side-by-side comparison visual, split design, versus layout',
      conclusion: 'Closing visual, forward-looking, achievement or celebration',
    };

    const baseHint = typeHints[section.type] ?? 'Professional presentation slide background';
    return `${baseHint}. Topic: ${section.heading}`;
  }

  /**
   * Ensure slide count falls within the target range.
   * Renumbers all slides sequentially.
   */
  private enforceSlideRange(
    slides: SlideDefinition[],
    minSlides: number,
    maxSlides: number,
  ): SlideDefinition[] {
    let result = slides;

    // If too many slides, merge the smallest adjacent content slides
    while (result.length > maxSlides) {
      const mergeIndex = this.findBestMergeCandidate(result);
      if (mergeIndex < 0) break;

      const current = result[mergeIndex];
      const next = result[mergeIndex + 1];

      const merged: SlideDefinition = {
        slideNumber: current.slideNumber,
        title: current.title.replace(/\s*\(\d+\/\d+\)$/, ''),
        body: `${current.body}\n\n${next.body}`,
        speakerNotes: `${current.speakerNotes}\n\n${next.speakerNotes}`,
        slideType: current.slideType,
        imagePromptHint: current.imagePromptHint,
      };

      result = [
        ...result.slice(0, mergeIndex),
        merged,
        ...result.slice(mergeIndex + 2),
      ];
    }

    // If too few slides, pad with additional content slides
    while (result.length < minSlides) {
      // Duplicate a content-heavy slide or add a transition slide
      const transitionSlide: SlideDefinition = {
        slideNumber: result.length,
        title: 'Key Takeaway',
        body: 'Summarizing the core insight from the preceding section.',
        speakerNotes: 'Pause for emphasis. Let the audience absorb the key point.',
        slideType: SlideType.CONTENT,
        imagePromptHint: 'Minimalist transition slide, key insight highlight, clean design',
      };
      // Insert before the last slide (CTA)
      result = [
        ...result.slice(0, result.length - 1),
        transitionSlide,
        result[result.length - 1],
      ];
    }

    // Renumber all slides
    return result.map((slide, index) => ({
      ...slide,
      slideNumber: index + 1,
    }));
  }

  /**
   * Find the best pair of adjacent slides to merge (smallest combined word count).
   * Only merges CONTENT-type slides, never TITLE or CTA.
   */
  private findBestMergeCandidate(slides: SlideDefinition[]): number {
    let bestIndex = -1;
    let bestWordCount = Infinity;

    for (let i = 1; i < slides.length - 1; i++) {
      const current = slides[i];
      const next = slides[i + 1];

      // Skip title, CTA, and the last slide
      if (!current || !next) continue;
      if (current.slideType === SlideType.TITLE || current.slideType === SlideType.CTA) continue;
      if (next.slideType === SlideType.TITLE || next.slideType === SlideType.CTA) continue;

      const combined = this.countWords(current.body) + this.countWords(next.body);
      if (combined < bestWordCount && combined <= MAX_WORDS_PER_SLIDE) {
        bestWordCount = combined;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private countWords(text: string): number {
    const stripped = text.replace(/[^\w\s]/g, ' ').trim();
    if (stripped.length === 0) return 0;
    return stripped.split(/\s+/).length;
  }

  private truncateToSentence(text: string, maxWords: number): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    const truncated = words.slice(0, maxWords).join(' ');
    // Try to end at a sentence boundary
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > truncated.length / 2) {
      return truncated.slice(0, lastPeriod + 1);
    }
    return truncated + '...';
  }

  private chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
