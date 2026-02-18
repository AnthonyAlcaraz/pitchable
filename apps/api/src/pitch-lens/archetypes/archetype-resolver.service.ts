import { Injectable } from '@nestjs/common';
import type {
  AudienceType,
  CompanyStage,
  DeckArchetype,
  PitchGoal,
} from '../../../generated/prisma/enums.js';
import {
  DECK_ARCHETYPES,
  getArchetypeConfig,
  getAllArchetypes,
  type DeckArchetypeConfig,
} from './deck-archetypes.config.js';

// ── Types ────────────────────────────────────────────────────

export interface ArchetypeRecommendation {
  archetype: DeckArchetypeConfig;
  score: number;
  reasons: string[];
}

export interface ArchetypePitchLensDefaults {
  audienceType: AudienceType;
  pitchGoal: PitchGoal;
  toneStyle: string;
  selectedFramework: string;
  maxBulletsPerSlide: number;
  maxWordsPerSlide: number;
  maxTableRows: number;
}

// ── Stage affinity map ───────────────────────────────────────

const STAGE_AFFINITY: Record<string, DeckArchetype[]> = {
  IDEA: ['PRE_SEED_PITCH', 'PRODUCT_LAUNCH'],
  MVP: ['PRE_SEED_PITCH', 'INVESTOR_PITCH', 'PRODUCT_LAUNCH'],
  GROWTH: ['INVESTOR_PITCH', 'SALES_DECK', 'STRATEGY_BRIEF'],
  ENTERPRISE: ['SALES_DECK', 'STRATEGY_BRIEF', 'BOARD_UPDATE'],
};

// ── Content signal patterns for framework recommendation ─────

const CONTENT_SIGNALS: Array<{
  patterns: RegExp[];
  frameworks: string[];
  label: string;
}> = [
  {
    patterns: [/founded/i, /discovered/i, /personal experience/i, /I realized/i, /aha moment/i, /my background/i],
    frameworks: ['FOUNDER_INSIGHT'],
    label: 'Founder story signals',
  },
  {
    patterns: [/breakthrough/i, /paradigm/i, /fundamental(ly)? (limit|broken|flaw)/i, /status quo/i, /impossible until/i],
    frameworks: ['WORLD_IS_BROKEN'],
    label: 'Paradigm shift signals',
  },
  {
    patterns: [/screenshot/i, /demo/i, /prototype/i, /app\b/i, /user interface/i, /UX\b/i, /product.{0,10}(ready|live|built)/i],
    frameworks: ['PRODUCT_FIRST'],
    label: 'Product-forward signals',
  },
];

// ── Service ──────────────────────────────────────────────────

@Injectable()
export class ArchetypeResolverService {
  /**
   * Recommend top 3 archetypes based on audience + goal + stage + content signals.
   * Scoring: +40 audience match, +40 goal match, +20 base, +20 stage match, +15 per content signal.
   */
  recommendArchetypes(
    audienceType: AudienceType,
    pitchGoal: PitchGoal,
    companyStage?: CompanyStage,
    kbTextSample?: string,
  ): ArchetypeRecommendation[] {
    const scored = DECK_ARCHETYPES.map((archetype) => {
      let score = 20; // base score
      const reasons: string[] = [];

      if (archetype.defaultAudience === audienceType) {
        score += 40;
        reasons.push(`Primary audience: ${audienceType}`);
      }
      if (archetype.defaultGoal === pitchGoal) {
        score += 40;
        reasons.push(`Primary goal: ${pitchGoal}`);
      }

      // Stage affinity scoring
      if (companyStage && STAGE_AFFINITY[companyStage]?.includes(archetype.id)) {
        score += 20;
        reasons.push(`Stage fit: ${companyStage}`);
      }

      // Content signal scoring — check KB text for narrative hints
      if (kbTextSample) {
        const sample = kbTextSample.slice(0, 1000);
        for (const signal of CONTENT_SIGNALS) {
          const matched = signal.patterns.some((p) => p.test(sample));
          if (matched && archetype.defaultFrameworks.some((f) => signal.frameworks.includes(f))) {
            score += 15;
            reasons.push(signal.label);
          }
        }
      }

      return { archetype, score, reasons };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Get PitchLens default values from an archetype.
   */
  getDefaults(archetypeId: DeckArchetype): ArchetypePitchLensDefaults | null {
    const config = getArchetypeConfig(archetypeId);
    if (!config) return null;

    return {
      audienceType: config.defaultAudience,
      pitchGoal: config.defaultGoal,
      toneStyle: config.defaultTone,
      selectedFramework: config.defaultFrameworks[0],
      maxBulletsPerSlide: config.densityProfile.maxBulletsPerSlide ?? 4,
      maxWordsPerSlide: config.densityProfile.maxWordsPerSlide ?? 50,
      maxTableRows: config.densityProfile.maxTableRows ?? 4,
    };
  }

  /**
   * Build the archetype-specific prompt block for injection
   * into outline and slide generation system prompts.
   */
  buildArchetypeInjection(archetypeId: DeckArchetype): string {
    const config = getArchetypeConfig(archetypeId);
    if (!config) return '';

    const parts: string[] = [];

    parts.push(`\n## Deck Archetype: "${config.name}"`);
    parts.push(config.description);
    parts.push('');

    parts.push('### ARCHETYPE NARRATIVE RULES (MANDATORY):');
    config.narrativeRules.forEach((rule, i) => {
      parts.push(`${i + 1}. ${rule}`);
    });

    parts.push('');
    parts.push('### SLIDE TYPE REQUIREMENTS:');
    config.slideTypeDistribution.forEach((req) => {
      parts.push(
        `- At least ${req.min} ${req.slideType} slide(s): ${req.description}`,
      );
    });

    parts.push('');
    parts.push(
      `### SLIDE RANGE: ${config.slideRange.min}-${config.slideRange.max} slides`,
    );

    parts.push('');
    parts.push('### ANTI-PATTERNS (NEVER do these):');
    config.antiPatterns.forEach((ap) => {
      parts.push(`- ${ap}`);
    });

    return parts.join('\n');
  }

  /**
   * Get extra quality rules for a specific agent from the archetype.
   */
  getQualityGateRules(
    archetypeId: DeckArchetype,
    agent: 'style' | 'narrative' | 'fact_check',
  ): { threshold?: number; extraRules: string[] } {
    const config = getArchetypeConfig(archetypeId);
    if (!config) return { extraRules: [] };

    const gate = config.qualityGates.find((g) => g.agent === agent);
    return gate ?? { extraRules: [] };
  }

  /**
   * List all archetypes (for API listing endpoint).
   */
  listArchetypes(): DeckArchetypeConfig[] {
    return getAllArchetypes();
  }

  /**
   * Get a single archetype by ID (for API detail endpoint).
   */
  getArchetype(archetypeId: DeckArchetype): DeckArchetypeConfig | undefined {
    return getArchetypeConfig(archetypeId);
  }
}
