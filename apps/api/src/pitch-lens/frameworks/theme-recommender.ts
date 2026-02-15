import type {
  AudienceType,
  PitchGoal,
} from '../../../generated/prisma/enums.js';
import type { ThemeMeta } from '../../themes/themes.service.js';

export interface ThemeRecommendation {
  themeName: string;
  displayName: string;
  description: string;
  score: number;
  reasons: string[];
}

interface ThemeCandidate {
  name: string;
  displayName: string;
  description: string;
  meta: ThemeMeta;
}

/**
 * Recommend the top 3 themes based on audience, goal, and optional framework.
 *
 * Scoring:
 *   +30 — audience type matches theme's bestForAudience
 *   +30 — pitch goal matches theme's bestForGoals
 *   +25 — selected framework is in theme's suggestedFrameworks
 *   +15 — framework category alignment (consulting framework → consulting theme, etc.)
 *   Tie-break by theme versatility (audience + goal coverage)
 */
export function recommendThemes(
  themes: ThemeCandidate[],
  audienceType: AudienceType,
  pitchGoal: PitchGoal,
  selectedFramework?: string,
): ThemeRecommendation[] {
  const scored = themes.map((theme) => {
    let score = 0;
    const reasons: string[] = [];

    // Audience match (+30)
    if (theme.meta.bestForAudience.includes(audienceType)) {
      score += 30;
      reasons.push(`Designed for ${formatEnum(audienceType)} audiences`);
    }

    // Goal match (+30)
    if (theme.meta.bestForGoals.includes(pitchGoal)) {
      score += 30;
      reasons.push(`Optimized for "${formatEnum(pitchGoal)}" presentations`);
    }

    // Exact framework match (+25)
    if (selectedFramework && theme.meta.suggestedFrameworks.includes(selectedFramework)) {
      score += 25;
      reasons.push(`Pairs naturally with ${formatEnum(selectedFramework)} framework`);
    }

    // Category alignment (+15)
    if (selectedFramework) {
      const categoryScore = getCategoryAlignment(theme.meta.category, selectedFramework);
      score += categoryScore;
      if (categoryScore > 0) {
        reasons.push(`${capitalize(theme.meta.category)} style matches framework tone`);
      }
    }

    // Tie-break: theme versatility (0-5 points)
    const versatility = theme.meta.bestForAudience.length + theme.meta.bestForGoals.length;
    score += Math.min(versatility, 5);

    return {
      themeName: theme.name,
      displayName: theme.displayName,
      description: theme.description,
      score,
      reasons,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/** Consulting frameworks → consulting/light themes. Story frameworks → creative/dark themes. */
function getCategoryAlignment(themeCategory: string, frameworkId: string): number {
  const consultingFrameworks = new Set(['MCKINSEY_SCR', 'MINTO_PYRAMID', 'WHAT_SO_WHAT_NOW_WHAT']);
  const storyFrameworks = new Set(['HEROS_JOURNEY', 'PIXAR_PITCH', 'TALK_LIKE_TED', 'RESONATE']);
  const salesFrameworks = new Set(['PAS', 'BAB', 'POPP']);

  if (consultingFrameworks.has(frameworkId) && (themeCategory === 'consulting' || themeCategory === 'light')) {
    return 15;
  }
  if (storyFrameworks.has(frameworkId) && (themeCategory === 'creative' || themeCategory === 'dark')) {
    return 15;
  }
  if (salesFrameworks.has(frameworkId) && (themeCategory === 'dark' || themeCategory === 'light')) {
    return 10;
  }
  return 0;
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
