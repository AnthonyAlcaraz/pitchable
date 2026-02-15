import type {
  AudienceType,
  PitchGoal,
  CompanyStage,
  TechnicalLevel,
} from '../../../generated/prisma/enums.js';
import { STORY_FRAMEWORKS } from './story-frameworks.config.js';
import type { StoryFrameworkConfig } from './story-frameworks.config.js';

export interface FrameworkRecommendation {
  framework: StoryFrameworkConfig;
  score: number;
  reasons: string[];
}

/**
 * Recommend the top 3 storytelling frameworks based on questionnaire answers.
 *
 * Scoring:
 *   +30 — audience type is in framework's bestFor
 *   +30 — pitch goal is in framework's bestForGoals
 *   +20 — company stage alignment
 *   +20 — technical level alignment
 *   Tie-break by framework versatility (audience + goal coverage count)
 */
export function recommendFrameworks(
  audienceType: AudienceType,
  pitchGoal: PitchGoal,
  companyStage: CompanyStage,
  technicalLevel: TechnicalLevel,
): FrameworkRecommendation[] {
  const scored = STORY_FRAMEWORKS.map((framework) => {
    let score = 0;
    const reasons: string[] = [];

    // Audience match (+30)
    if (framework.bestFor.includes(audienceType)) {
      score += 30;
      reasons.push(`Designed for ${formatEnum(audienceType)} audiences`);
    }

    // Goal match (+30)
    if (framework.bestForGoals.includes(pitchGoal)) {
      score += 30;
      reasons.push(`Optimized for "${formatEnum(pitchGoal)}" presentations`);
    }

    // Company stage alignment (+20)
    score += getStageScore(framework, companyStage);
    const stageReason = getStageReason(framework, companyStage);
    if (stageReason) reasons.push(stageReason);

    // Technical level alignment (+20)
    score += getTechnicalScore(framework, technicalLevel);
    const techReason = getTechnicalReason(framework, technicalLevel);
    if (techReason) reasons.push(techReason);

    // Tie-break: framework versatility (0-5 points)
    const versatility = framework.bestFor.length + framework.bestForGoals.length;
    score += Math.min(versatility, 5);

    return { framework, score, reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function getStageScore(
  framework: StoryFrameworkConfig,
  stage: CompanyStage,
): number {
  const stageMap: Record<string, string[]> = {
    HEROS_JOURNEY: ['MVP', 'GROWTH'],
    MINTO_PYRAMID: ['GROWTH', 'ENTERPRISE'],
    RESONATE: ['GROWTH', 'ENTERPRISE'],
    PAS: ['IDEA', 'MVP', 'GROWTH'],
    BAB: ['IDEA', 'MVP'],
    STAR: ['GROWTH', 'ENTERPRISE'],
    PIXAR_PITCH: ['IDEA', 'MVP'],
    MCKINSEY_SCR: ['GROWTH', 'ENTERPRISE'],
    POPP: ['MVP', 'GROWTH'],
    KAWASAKI_10_20_30: ['IDEA', 'MVP'],
    WHAT_SO_WHAT_NOW_WHAT: ['GROWTH', 'ENTERPRISE'],
    TALK_LIKE_TED: ['MVP', 'GROWTH', 'ENTERPRISE'],
  };

  const stages = stageMap[framework.id] ?? [];
  return stages.includes(stage) ? 20 : 5;
}

function getStageReason(
  framework: StoryFrameworkConfig,
  stage: CompanyStage,
): string | null {
  const stageMap: Record<string, string[]> = {
    HEROS_JOURNEY: ['MVP', 'GROWTH'],
    MINTO_PYRAMID: ['GROWTH', 'ENTERPRISE'],
    RESONATE: ['GROWTH', 'ENTERPRISE'],
    PAS: ['IDEA', 'MVP', 'GROWTH'],
    BAB: ['IDEA', 'MVP'],
    STAR: ['GROWTH', 'ENTERPRISE'],
    PIXAR_PITCH: ['IDEA', 'MVP'],
    MCKINSEY_SCR: ['GROWTH', 'ENTERPRISE'],
    POPP: ['MVP', 'GROWTH'],
    KAWASAKI_10_20_30: ['IDEA', 'MVP'],
    WHAT_SO_WHAT_NOW_WHAT: ['GROWTH', 'ENTERPRISE'],
    TALK_LIKE_TED: ['MVP', 'GROWTH', 'ENTERPRISE'],
  };

  const stages = stageMap[framework.id] ?? [];
  if (stages.includes(stage)) {
    return `Well-suited for ${formatEnum(stage)}-stage companies`;
  }
  return null;
}

function getTechnicalScore(
  framework: StoryFrameworkConfig,
  level: TechnicalLevel,
): number {
  const techMap: Record<string, string[]> = {
    HEROS_JOURNEY: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    MINTO_PYRAMID: ['SEMI_TECHNICAL', 'TECHNICAL', 'HIGHLY_TECHNICAL'],
    RESONATE: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    PAS: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    BAB: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    STAR: ['TECHNICAL', 'HIGHLY_TECHNICAL'],
    PIXAR_PITCH: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    MCKINSEY_SCR: ['SEMI_TECHNICAL', 'TECHNICAL'],
    POPP: ['SEMI_TECHNICAL', 'TECHNICAL'],
    KAWASAKI_10_20_30: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    WHAT_SO_WHAT_NOW_WHAT: ['TECHNICAL', 'HIGHLY_TECHNICAL'],
    TALK_LIKE_TED: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
  };

  const levels = techMap[framework.id] ?? [];
  return levels.includes(level) ? 20 : 5;
}

function getTechnicalReason(
  framework: StoryFrameworkConfig,
  level: TechnicalLevel,
): string | null {
  const techMap: Record<string, string[]> = {
    HEROS_JOURNEY: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    MINTO_PYRAMID: ['SEMI_TECHNICAL', 'TECHNICAL', 'HIGHLY_TECHNICAL'],
    RESONATE: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    PAS: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    BAB: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    STAR: ['TECHNICAL', 'HIGHLY_TECHNICAL'],
    PIXAR_PITCH: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    MCKINSEY_SCR: ['SEMI_TECHNICAL', 'TECHNICAL'],
    POPP: ['SEMI_TECHNICAL', 'TECHNICAL'],
    KAWASAKI_10_20_30: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
    WHAT_SO_WHAT_NOW_WHAT: ['TECHNICAL', 'HIGHLY_TECHNICAL'],
    TALK_LIKE_TED: ['NON_TECHNICAL', 'SEMI_TECHNICAL'],
  };

  const levels = techMap[framework.id] ?? [];
  if (levels.includes(level)) {
    return `Matches ${formatEnum(level)} audience depth`;
  }
  return null;
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
