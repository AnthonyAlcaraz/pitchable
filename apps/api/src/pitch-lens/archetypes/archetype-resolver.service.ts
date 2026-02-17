import { Injectable } from '@nestjs/common';
import type {
  AudienceType,
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

// ── Service ──────────────────────────────────────────────────

@Injectable()
export class ArchetypeResolverService {
  /**
   * Recommend top 3 archetypes based on audience + goal signals.
   * Scoring: +40 audience match, +40 goal match, +20 base.
   */
  recommendArchetypes(
    audienceType: AudienceType,
    pitchGoal: PitchGoal,
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
