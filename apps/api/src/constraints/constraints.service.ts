import { Injectable } from '@nestjs/common';

import {
  validatePalette,
  validateColorPair,
  validateTextContrast,
  getContrastRatio,
  type SlidePalette,
  type ColorValidationResult,
  type ContrastResult,
} from './color-validator';

import {
  validateFontChoice,
  validateFontSizes,
  validateFontPairing,
  validateDeckFonts,
  ALLOWED_FONTS,
  FONT_SIZE_MINIMUMS,
  type FontSizes,
  type FontValidationResult,
  type FontSizeValidationResult,
  type FontPairingResult,
  type DeckFontsResult,
} from './typography-validator';

import {
  validateSlideContent,
  suggestSplit,
  DENSITY_LIMITS,
  type SlideContent,
  type DensityValidationResult,
  type SplitResult,
} from './density-validator';

import {
  validateLayout,
  type LayoutConfig,
  type LayoutValidationResult,
} from './layout-validator';

import {
  validateSlideDesign,
  type SlideTheme,
  type DesignValidationResult,
} from './index';

// ── Service-Level Interfaces ────────────────────────────────

export interface TypographyInput {
  headingFont: string;
  bodyFont: string;
  allFonts?: string[];
  sizes?: FontSizes;
}

export interface TypographyValidationResult {
  headingFont: FontValidationResult;
  bodyFont: FontValidationResult;
  pairing: FontPairingResult;
  sizes: FontSizeValidationResult;
  deckFonts?: DeckFontsResult;
  valid: boolean;
  violations: string[];
}

export interface AutoFixResult {
  fixed: boolean;
  changes: string[];
  slides: SlideContent[];
  palette?: SlidePalette;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ConstraintsService {
  /**
   * Validate a color palette against forbidden pair rules
   * and check text/background contrast.
   */
  validatePalette(palette: SlidePalette): ColorValidationResult & { textContrast: ContrastResult } {
    const paletteResult = validatePalette(palette);
    const textContrast = validateTextContrast(palette.text, palette.background);

    const violations = [...paletteResult.violations];
    if (!textContrast.valid) {
      violations.push(
        `Text/background contrast ratio ${textContrast.ratio}:1 is below WCAG AA minimum ${textContrast.required}:1`,
      );
    }

    return {
      valid: paletteResult.valid && textContrast.valid,
      violations,
      textContrast,
    };
  }

  /**
   * Validate typography: font choices, pairing, sizes, deck-wide count.
   */
  validateTypography(input: TypographyInput): TypographyValidationResult {
    const headingFont = validateFontChoice(input.headingFont);
    const bodyFont = validateFontChoice(input.bodyFont);
    const pairing = validateFontPairing(input.headingFont, input.bodyFont);
    const sizes = validateFontSizes(input.sizes ?? {});
    const deckFonts = input.allFonts ? validateDeckFonts(input.allFonts) : undefined;

    const violations: string[] = [];

    if (!headingFont.valid) {
      violations.push(
        `Heading font "${input.headingFont}" not allowed${headingFont.suggestion ? `. Suggested: "${headingFont.suggestion}"` : ''}`,
      );
    }
    if (!bodyFont.valid) {
      violations.push(
        `Body font "${input.bodyFont}" not allowed${bodyFont.suggestion ? `. Suggested: "${bodyFont.suggestion}"` : ''}`,
      );
    }
    if (!pairing.valid && pairing.reason) {
      violations.push(pairing.reason);
    }
    violations.push(...sizes.violations);
    if (deckFonts && !deckFonts.valid) {
      violations.push(...deckFonts.violations);
    }

    return {
      headingFont,
      bodyFont,
      pairing,
      sizes,
      deckFonts,
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validate content density for a single slide.
   */
  validateDensity(slide: SlideContent): DensityValidationResult {
    return validateSlideContent(slide);
  }

  /**
   * Validate layout constraints for a single slide.
   */
  validateLayout(layout: LayoutConfig): LayoutValidationResult {
    return validateLayout(layout);
  }

  /**
   * Run all validators against a slide + theme.
   */
  validateSlide(slide: SlideContent, theme: SlideTheme): DesignValidationResult {
    return validateSlideDesign(slide, theme);
  }

  /**
   * Attempt to auto-fix violations.
   *
   * - Dense slides: split into multiple slides
   * - Low text contrast: swap text color to black or white
   *   depending on which yields better contrast
   *
   * Returns the list of changes made and the fixed artifacts.
   */
  /**
   * Validate a theme definition against all constraint rules.
   * Checks fonts, pairing, and color palette.
   */
  validateTheme(theme: {
    headingFont: string;
    bodyFont: string;
    textColor: string;
    backgroundColor: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  }): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    const headingResult = validateFontChoice(theme.headingFont);
    if (!headingResult.valid) {
      violations.push(
        `Heading font "${theme.headingFont}" not allowed${headingResult.suggestion ? `. Suggested: "${headingResult.suggestion}"` : ''}`,
      );
    }

    const bodyResult = validateFontChoice(theme.bodyFont);
    if (!bodyResult.valid) {
      violations.push(
        `Body font "${theme.bodyFont}" not allowed${bodyResult.suggestion ? `. Suggested: "${bodyResult.suggestion}"` : ''}`,
      );
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
        `Text/background contrast ratio ${contrastResult.ratio}:1 is below WCAG AA minimum ${contrastResult.required}:1`,
      );
    }

    const paletteResult = validatePalette(palette);
    violations.push(...paletteResult.violations);

    return { valid: violations.length === 0, violations };
  }

  autoFixSlide(slide: SlideContent, theme: SlideTheme): AutoFixResult {
    const changes: string[] = [];
    let fixedSlides: SlideContent[] = [slide];
    let fixedPalette: SlidePalette | undefined;

    // ── Fix density: auto-split overcrowded slides ──
    const densityResult = validateSlideContent(slide);
    if (!densityResult.valid) {
      const splitResult: SplitResult = suggestSplit(slide);
      if (splitResult.shouldSplit) {
        fixedSlides = splitResult.newSlides;
        changes.push(
          `Split overcrowded slide into ${splitResult.newSlides.length} slides`,
        );
      }
    }

    // ── Fix text contrast: pick black or white text ──
    const contrastResult = validateTextContrast(
      theme.palette.text,
      theme.palette.background,
    );
    if (!contrastResult.valid) {
      const blackRatio = getContrastRatio('#000000', theme.palette.background);
      const whiteRatio = getContrastRatio('#FFFFFF', theme.palette.background);

      const betterTextColor = blackRatio >= whiteRatio ? '#000000' : '#FFFFFF';
      const betterRatio = Math.max(blackRatio, whiteRatio);

      fixedPalette = { ...theme.palette, text: betterTextColor };
      changes.push(
        `Changed text color from ${theme.palette.text} to ${betterTextColor} (contrast ${Math.round(betterRatio * 100) / 100}:1)`,
      );
    }

    // ── Check forbidden color pairs — report but don't auto-fix ──
    // Color palette choices require design intent; we flag but leave
    // the decision to the user or a higher-level orchestrator.
    const paletteResult = validatePalette(fixedPalette ?? theme.palette);
    if (!paletteResult.valid) {
      for (const violation of paletteResult.violations) {
        changes.push(`[Manual fix needed] ${violation}`);
      }
    }

    return {
      fixed: changes.length > 0,
      changes,
      slides: fixedSlides,
      palette: fixedPalette,
    };
  }
}
