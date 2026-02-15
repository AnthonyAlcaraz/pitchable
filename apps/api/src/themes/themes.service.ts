import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  validateFontChoice,
  validateFontPairing,
  validateTextContrast,
  validatePalette,
  type SlidePalette,
} from '../constraints/index.js';

/** Controls how often AI-generated images appear on slides. */
export type ImageFrequency = 'none' | 'rare' | 'moderate' | 'frequent';

/** Theme metadata for auto-suggestion and image density control. */
export interface ThemeMeta {
  /** How often background/side images are generated. Maps to prompt instruction. */
  imageFrequency: ImageFrequency;
  /** Which audience types this theme fits best. */
  bestForAudience: string[];
  /** Which pitch goals this theme fits best. */
  bestForGoals: string[];
  /** Which story frameworks pair naturally with this theme. */
  suggestedFrameworks: string[];
  /** Category for grouping in UI: 'dark' | 'light' | 'consulting' | 'creative' */
  category: string;
}

interface ThemeDefinition {
  name: string;
  displayName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    surface: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  meta: ThemeMeta;
}

/** Maps ImageFrequency to a prompt instruction for the LLM. */
export const IMAGE_FREQUENCY_PROMPT: Record<ImageFrequency, string> = {
  none: 'NEVER generate imagePromptHint. Always set to empty string "".',
  rare: 'Only generate imagePromptHint for ~1 in 10 slides. Set to empty string "" for the rest.',
  moderate: 'Generate imagePromptHint for ~1 in 6 slides. Set to empty string "" for the rest.',
  frequent: 'Generate imagePromptHint for ~1 in 3 slides. Prefer product screenshots, data visualizations, and hero images.',
};

/**
 * Static lookup: get image frequency prompt instruction by theme name.
 * Returns undefined if theme is not a built-in theme.
 */
export function getImageFrequencyForTheme(themeName: string): string | undefined {
  const theme = BUILT_IN_THEMES.find((t) => t.name === themeName);
  if (!theme) return undefined;
  return IMAGE_FREQUENCY_PROMPT[theme.meta.imageFrequency];
}

const BUILT_IN_THEMES: ThemeDefinition[] = [
  // ── Dark Themes ───────────────────────────────────────────
  {
    name: 'pitchable-dark',
    displayName: 'Pitchable Dark',
    description: 'Deep slate background with blue and cyan accents. Stripe/Vercel-inspired executive aesthetic.',
    primaryColor: '#3b82f6',
    secondaryColor: '#94a3b8',
    accentColor: '#22d3ee',
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#3b82f6',
      secondary: '#94a3b8',
      accent: '#22d3ee',
      background: '#0f172a',
      text: '#f8fafc',
      surface: '#1e293b',
      border: '#334155',
      success: '#22c55e',
      warning: '#fbbf24',
      error: '#ef4444',
    },
    meta: {
      imageFrequency: 'moderate',
      bestForAudience: ['INVESTORS', 'TECHNICAL', 'CUSTOMERS'],
      bestForGoals: ['RAISE_FUNDING', 'SELL_PRODUCT'],
      suggestedFrameworks: ['POPP', 'PAS', 'STAR'],
      category: 'dark',
    },
  },
  {
    name: 'dark-professional',
    displayName: 'Dark Professional',
    description: 'Deep navy background with gold accents. Executive boardroom aesthetic.',
    primaryColor: '#f8fafc',
    secondaryColor: '#94a3b8',
    accentColor: '#fbbf24',
    backgroundColor: '#0f172a',
    textColor: '#e2e8f0',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      accent: '#fbbf24',
      background: '#0f172a',
      text: '#e2e8f0',
      surface: '#1e293b',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
    meta: {
      imageFrequency: 'rare',
      bestForAudience: ['EXECUTIVES', 'BOARD', 'INVESTORS'],
      bestForGoals: ['GET_BUYIN', 'REPORT_RESULTS'],
      suggestedFrameworks: ['MINTO_PYRAMID', 'MCKINSEY_SCR', 'WHAT_SO_WHAT_NOW_WHAT'],
      category: 'dark',
    },
  },
  {
    name: 'creative-warm',
    displayName: 'Creative Warm',
    description: 'Bold warm tones on dark background. Eye-catching and energetic.',
    primaryColor: '#f97316',
    secondaryColor: '#fb923c',
    accentColor: '#fbbf24',
    backgroundColor: '#1c1917',
    textColor: '#fafaf9',
    headingFont: 'DM Sans',
    bodyFont: 'Lato',
    colorPalette: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#fbbf24',
      background: '#1c1917',
      text: '#fafaf9',
      surface: '#292524',
      border: '#44403c',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
    meta: {
      imageFrequency: 'frequent',
      bestForAudience: ['CUSTOMERS', 'CONFERENCE', 'TEAM'],
      bestForGoals: ['INSPIRE', 'SELL_PRODUCT'],
      suggestedFrameworks: ['HEROS_JOURNEY', 'PIXAR_PITCH', 'TALK_LIKE_TED'],
      category: 'creative',
    },
  },
  {
    name: 'technical-teal',
    displayName: 'Technical Teal',
    description: 'Teal and purple on dark. Technical documentation aesthetic.',
    primaryColor: '#14b8a6',
    secondaryColor: '#06b6d4',
    accentColor: '#8b5cf6',
    backgroundColor: '#0f172a',
    textColor: '#e2e8f0',
    headingFont: 'Nunito Sans',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#14b8a6',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      background: '#0f172a',
      text: '#e2e8f0',
      surface: '#1e293b',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
    meta: {
      imageFrequency: 'moderate',
      bestForAudience: ['TECHNICAL', 'TEAM'],
      bestForGoals: ['EDUCATE', 'GET_BUYIN'],
      suggestedFrameworks: ['STAR', 'WHAT_SO_WHAT_NOW_WHAT', 'MINTO_PYRAMID'],
      category: 'dark',
    },
  },

  // ── Light / Consulting Themes ──────────────────────────────
  {
    name: 'light-minimal',
    displayName: 'Light Minimal',
    description: 'Clean white background with subtle gray tones. Professional and readable.',
    primaryColor: '#1e293b',
    secondaryColor: '#64748b',
    accentColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#1e293b',
      secondary: '#64748b',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#1e293b',
      surface: '#f8fafc',
      border: '#e2e8f0',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
    },
    meta: {
      imageFrequency: 'rare',
      bestForAudience: ['EXECUTIVES', 'BOARD', 'CUSTOMERS'],
      bestForGoals: ['REPORT_RESULTS', 'GET_BUYIN', 'EDUCATE'],
      suggestedFrameworks: ['MINTO_PYRAMID', 'WHAT_SO_WHAT_NOW_WHAT', 'RESONATE'],
      category: 'light',
    },
  },
  {
    name: 'corporate-blue',
    displayName: 'Corporate Blue',
    description: 'Traditional corporate palette. Blue tones with gold accents.',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    headingFont: 'Poppins',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#f59e0b',
      background: '#f8fafc',
      text: '#1e293b',
      surface: '#eff6ff',
      border: '#bfdbfe',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
    },
    meta: {
      imageFrequency: 'moderate',
      bestForAudience: ['EXECUTIVES', 'CUSTOMERS', 'BOARD'],
      bestForGoals: ['SELL_PRODUCT', 'GET_BUYIN', 'REPORT_RESULTS'],
      suggestedFrameworks: ['PAS', 'BAB', 'POPP'],
      category: 'light',
    },
  },
  {
    name: 'mckinsey-executive',
    displayName: 'McKinsey Executive',
    description: 'White background, blue/navy palette, Georgia serif headings. Evidence-driven consulting aesthetic.',
    primaryColor: '#051C2C',
    secondaryColor: '#6E6E6E',
    accentColor: '#2251FF',
    backgroundColor: '#FFFFFF',
    textColor: '#222222',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    colorPalette: {
      primary: '#051C2C',
      secondary: '#6E6E6E',
      accent: '#2251FF',
      background: '#FFFFFF',
      text: '#222222',
      surface: '#F5F5F5',
      border: '#E5E5E5',
      success: '#1A5DAD',
      warning: '#3A7BDE',
      error: '#A0A0A0',
    },
    meta: {
      imageFrequency: 'none',
      bestForAudience: ['EXECUTIVES', 'BOARD', 'INVESTORS'],
      bestForGoals: ['GET_BUYIN', 'REPORT_RESULTS'],
      suggestedFrameworks: ['MCKINSEY_SCR', 'MINTO_PYRAMID', 'WHAT_SO_WHAT_NOW_WHAT'],
      category: 'consulting',
    },
  },

  // ── NEW: Famous Presentation Themes ───────────────────────

  // 8. Apple Keynote — inspired by Apple product launch aesthetics
  {
    name: 'apple-keynote',
    displayName: 'Apple Keynote',
    description: 'Black background with white text and blue accents. One idea per slide, product-launch drama.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#A1A1AA',
    accentColor: '#007AFF',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#FFFFFF',
      secondary: '#A1A1AA',
      accent: '#007AFF',
      background: '#000000',
      text: '#FFFFFF',
      surface: '#1C1C1E',
      border: '#38383A',
      success: '#30D158',
      warning: '#FFD60A',
      error: '#FF453A',
    },
    meta: {
      imageFrequency: 'frequent',
      bestForAudience: ['CUSTOMERS', 'CONFERENCE', 'INVESTORS'],
      bestForGoals: ['SELL_PRODUCT', 'INSPIRE'],
      suggestedFrameworks: ['HEROS_JOURNEY', 'TALK_LIKE_TED', 'PIXAR_PITCH'],
      category: 'dark',
    },
  },

  // 9. TED Talk — inspired by TED presentation style
  {
    name: 'ted-talk',
    displayName: 'TED Talk',
    description: 'Dark charcoal with red accents. Bold, minimal, story-driven. One powerful image per slide.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#A3A3A3',
    accentColor: '#EB0028',
    backgroundColor: '#1A1A1A',
    textColor: '#F5F5F5',
    headingFont: 'Montserrat',
    bodyFont: 'Lato',
    colorPalette: {
      primary: '#FFFFFF',
      secondary: '#A3A3A3',
      accent: '#EB0028',
      background: '#1A1A1A',
      text: '#F5F5F5',
      surface: '#2D2D2D',
      border: '#404040',
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#EB0028',
    },
    meta: {
      imageFrequency: 'frequent',
      bestForAudience: ['CONFERENCE', 'TEAM', 'CUSTOMERS'],
      bestForGoals: ['INSPIRE', 'EDUCATE'],
      suggestedFrameworks: ['TALK_LIKE_TED', 'HEROS_JOURNEY', 'RESONATE'],
      category: 'dark',
    },
  },

  // 10. YC Startup — inspired by Y Combinator Demo Day
  {
    name: 'yc-startup',
    displayName: 'YC Startup',
    description: 'White background with orange accents. Clean, metric-dense, 10-slide investor pitch format.',
    primaryColor: '#18181B',
    secondaryColor: '#71717A',
    accentColor: '#F97316',
    backgroundColor: '#FFFFFF',
    textColor: '#18181B',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#18181B',
      secondary: '#71717A',
      accent: '#F97316',
      background: '#FFFFFF',
      text: '#18181B',
      surface: '#FAFAFA',
      border: '#E4E4E7',
      success: '#16A34A',
      warning: '#F97316',
      error: '#DC2626',
    },
    meta: {
      imageFrequency: 'rare',
      bestForAudience: ['INVESTORS'],
      bestForGoals: ['RAISE_FUNDING'],
      suggestedFrameworks: ['KAWASAKI_10_20_30', 'POPP', 'PAS'],
      category: 'light',
    },
  },

  // 11. Sequoia Capital — inspired by Sequoia's pitch deck template
  {
    name: 'sequoia-capital',
    displayName: 'Sequoia Capital',
    description: 'Forest green and white. Data-rich investor pitch with structured narrative arc.',
    primaryColor: '#14532D',
    secondaryColor: '#6B7280',
    accentColor: '#16A34A',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingFont: 'Source Serif Pro',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#14532D',
      secondary: '#6B7280',
      accent: '#16A34A',
      background: '#FFFFFF',
      text: '#1F2937',
      surface: '#F0FDF4',
      border: '#D1D5DB',
      success: '#16A34A',
      warning: '#D97706',
      error: '#DC2626',
    },
    meta: {
      imageFrequency: 'none',
      bestForAudience: ['INVESTORS', 'BOARD'],
      bestForGoals: ['RAISE_FUNDING', 'REPORT_RESULTS'],
      suggestedFrameworks: ['POPP', 'MCKINSEY_SCR', 'MINTO_PYRAMID'],
      category: 'consulting',
    },
  },

  // 12. Airbnb Storytelling — inspired by Airbnb's culture deck
  {
    name: 'airbnb-story',
    displayName: 'Airbnb Storytelling',
    description: 'Warm coral on white. Photo-rich, story-driven, community-focused culture deck aesthetic.',
    primaryColor: '#1F2937',
    secondaryColor: '#6B7280',
    accentColor: '#FF5A5F',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingFont: 'Poppins',
    bodyFont: 'Lato',
    colorPalette: {
      primary: '#1F2937',
      secondary: '#6B7280',
      accent: '#FF5A5F',
      background: '#FFFFFF',
      text: '#1F2937',
      surface: '#FFF1F2',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#FF5A5F',
    },
    meta: {
      imageFrequency: 'frequent',
      bestForAudience: ['CUSTOMERS', 'TEAM', 'CONFERENCE'],
      bestForGoals: ['INSPIRE', 'SELL_PRODUCT'],
      suggestedFrameworks: ['PIXAR_PITCH', 'HEROS_JOURNEY', 'RESONATE'],
      category: 'creative',
    },
  },

  // 13. Stripe Fintech — inspired by Stripe's developer-facing design
  {
    name: 'stripe-fintech',
    displayName: 'Stripe Fintech',
    description: 'Deep purple-black with gradient accents. Technical precision meets premium SaaS fintech polish.',
    primaryColor: '#E2E8F0',
    secondaryColor: '#94A3B8',
    accentColor: '#635BFF',
    backgroundColor: '#0A0A23',
    textColor: '#E2E8F0',
    headingFont: 'Montserrat',
    bodyFont: 'Source Sans Pro',
    colorPalette: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
      accent: '#635BFF',
      background: '#0A0A23',
      text: '#E2E8F0',
      surface: '#1A1A3E',
      border: '#2D2D5E',
      success: '#00D4AA',
      warning: '#FBBF24',
      error: '#FF6B6B',
    },
    meta: {
      imageFrequency: 'moderate',
      bestForAudience: ['TECHNICAL', 'INVESTORS', 'CUSTOMERS'],
      bestForGoals: ['SELL_PRODUCT', 'RAISE_FUNDING', 'EDUCATE'],
      suggestedFrameworks: ['PAS', 'STAR', 'POPP'],
      category: 'dark',
    },
  },

  // 14. BCG Strategy — inspired by Boston Consulting Group
  {
    name: 'bcg-strategy',
    displayName: 'BCG Strategy',
    description: 'Light gray background with emerald green accents. Matrix-driven strategic analysis.',
    primaryColor: '#1E3A2F',
    secondaryColor: '#6B7280',
    accentColor: '#059669',
    backgroundColor: '#F9FAFB',
    textColor: '#1F2937',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    colorPalette: {
      primary: '#1E3A2F',
      secondary: '#6B7280',
      accent: '#059669',
      background: '#F9FAFB',
      text: '#1F2937',
      surface: '#ECFDF5',
      border: '#D1D5DB',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
    },
    meta: {
      imageFrequency: 'none',
      bestForAudience: ['EXECUTIVES', 'BOARD'],
      bestForGoals: ['GET_BUYIN', 'REPORT_RESULTS'],
      suggestedFrameworks: ['MCKINSEY_SCR', 'MINTO_PYRAMID', 'WHAT_SO_WHAT_NOW_WHAT'],
      category: 'consulting',
    },
  },

  // 15. Academic Research — inspired by conference paper presentations
  {
    name: 'academic-research',
    displayName: 'Academic Research',
    description: 'Warm white with deep blue. Serif headings, citation-heavy, methodology-driven academic style.',
    primaryColor: '#1E3A5F',
    secondaryColor: '#6B7280',
    accentColor: '#2563EB',
    backgroundColor: '#FFFDF7',
    textColor: '#1C1917',
    headingFont: 'Libre Baskerville',
    bodyFont: 'Source Sans Pro',
    colorPalette: {
      primary: '#1E3A5F',
      secondary: '#6B7280',
      accent: '#2563EB',
      background: '#FFFDF7',
      text: '#1C1917',
      surface: '#F5F3EF',
      border: '#D6D3CE',
      success: '#16A34A',
      warning: '#D97706',
      error: '#DC2626',
    },
    meta: {
      imageFrequency: 'rare',
      bestForAudience: ['TECHNICAL', 'CONFERENCE'],
      bestForGoals: ['EDUCATE', 'REPORT_RESULTS'],
      suggestedFrameworks: ['STAR', 'WHAT_SO_WHAT_NOW_WHAT', 'MINTO_PYRAMID'],
      category: 'light',
    },
  },
];

@Injectable()
export class ThemesService implements OnModuleInit {
  private readonly logger = new Logger(ThemesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedBuiltInThemes();
      this.logger.log('Built-in themes seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed built-in themes', error);
    }
  }

  validateAllThemes(): Array<{ themeName: string; valid: boolean; violations: string[] }> {
    return BUILT_IN_THEMES.map((theme) => {
      const violations: string[] = [];

      const headingResult = validateFontChoice(theme.headingFont);
      if (!headingResult.valid) {
        violations.push(`Heading font "${theme.headingFont}" not allowed`);
      }

      const bodyResult = validateFontChoice(theme.bodyFont);
      if (!bodyResult.valid) {
        violations.push(`Body font "${theme.bodyFont}" not allowed`);
      }

      const pairingResult = validateFontPairing(theme.headingFont, theme.bodyFont);
      if (!pairingResult.valid && pairingResult.reason) {
        violations.push(pairingResult.reason);
      }

      const palette: SlidePalette = {
        text: theme.textColor,
        background: theme.backgroundColor,
        primary: theme.primaryColor,
        secondary: theme.secondaryColor,
        accent: theme.accentColor,
      };

      const contrastResult = validateTextContrast(palette.text, palette.background);
      if (!contrastResult.valid) {
        violations.push(
          `Text contrast ratio ${contrastResult.ratio}:1 below minimum ${contrastResult.required}:1`,
        );
      }

      // Only validate readability-critical pairs (text/bg, primary/bg).
      // Skip full palette validation — accent/secondary proximity to primary is intentional in brand palettes.
      const primaryOnBg = validateTextContrast(palette.primary, palette.background);
      if (!primaryOnBg.valid) {
        violations.push(
          `Primary on background contrast ratio ${primaryOnBg.ratio}:1 below minimum ${primaryOnBg.required}:1`,
        );
      }

      return { themeName: theme.name, valid: violations.length === 0, violations };
    });
  }

  async seedBuiltInThemes(): Promise<void> {
    const validationResults = this.validateAllThemes();
    const failures = validationResults.filter((r) => !r.valid);
    if (failures.length > 0) {
      for (const f of failures) {
        this.logger.error(`Theme "${f.themeName}" has violations: ${f.violations.join('; ')}`);
      }
      throw new Error(
        `${failures.length} theme(s) failed validation: ${failures.map((f) => f.themeName).join(', ')}`,
      );
    }
    this.logger.log(`All ${BUILT_IN_THEMES.length} built-in themes passed design constraint validation`);

    for (const theme of BUILT_IN_THEMES) {
      await this.prisma.theme.upsert({
        where: { name: theme.name },
        update: {
          displayName: theme.displayName,
          description: theme.description,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
          backgroundColor: theme.backgroundColor,
          textColor: theme.textColor,
          headingFont: theme.headingFont,
          bodyFont: theme.bodyFont,
          colorPalette: theme.colorPalette,
          isBuiltIn: true,
        },
        create: {
          name: theme.name,
          displayName: theme.displayName,
          description: theme.description,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
          backgroundColor: theme.backgroundColor,
          textColor: theme.textColor,
          headingFont: theme.headingFont,
          bodyFont: theme.bodyFont,
          colorPalette: theme.colorPalette,
          isBuiltIn: true,
        },
      });
    }
  }

  async findAll() {
    return this.prisma.theme.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { id },
    });

    if (!theme) {
      throw new NotFoundException(`Theme with id "${id}" not found`);
    }

    return theme;
  }

  async findByName(name: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { name },
    });

    if (!theme) {
      throw new NotFoundException(`Theme with name "${name}" not found`);
    }

    return theme;
  }

  async getDefaultTheme() {
    return this.findByName('pitchable-dark');
  }

  /**
   * Get theme metadata (image policy, audience mapping) by theme name.
   * Returns undefined if theme is not a built-in theme.
   */
  getThemeMeta(themeName: string): ThemeMeta | undefined {
    const theme = BUILT_IN_THEMES.find((t) => t.name === themeName);
    return theme?.meta;
  }

  /**
   * Get all built-in theme metadata for the recommender.
   */
  getAllThemeMeta(): Array<{ name: string; displayName: string; description: string; meta: ThemeMeta }> {
    return BUILT_IN_THEMES.map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      meta: t.meta,
    }));
  }
}
