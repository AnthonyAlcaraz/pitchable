// ─────────────────────────────────────────────────────────────
// Barrel Export + Unified Validator — Design Constraint Engine
// ─────────────────────────────────────────────────────────────

// Re-export individual validators
export {
  hexToRgb,
  hexToHsl,
  hslToHex,
  rgbToLab,
  deltaE,
  luminance,
  contrastRatio,
  getContrastRatio,
  validateColorPair,
  validatePalette,
  validateTextContrast,
  FORBIDDEN_PAIRS,
  sampleImageLuminance,
} from './color-validator';

export type {
  HslColor,
  RgbColor,
  LabColor,
  ColorValidationResult,
  ContrastResult,
  SlidePalette,
  ImageLuminanceResult,
} from './color-validator';

export {
  validateFontChoice,
  validateFontSizes,
  validateFontPairing,
  validateDeckFonts,
  ALLOWED_FONTS,
  FONT_SIZE_MINIMUMS,
  MAX_FONTS_PER_DECK,
} from './typography-validator';

export type {
  FontValidationResult,
  FontSizeValidationResult,
  FontPairingResult,
  DeckFontsResult,
  FontSizes,
} from './typography-validator';

export {
  validateSlideContent,
  suggestSplit,
  DENSITY_LIMITS,
} from './density-validator';

export type {
  DensityLimits,
  SlideContent,
  DensityValidationResult,
  SplitResult,
} from './density-validator';

export {
  validateLayout,
  LAYOUT_LIMITS,
} from './layout-validator';

export type {
  LayoutConfig,
  LayoutValidationResult,
} from './layout-validator';

// ── Unified Slide Validator ─────────────────────────────────

import {
  validatePalette as _validatePalette,
  validateTextContrast as _validateTextContrast,
  type SlidePalette,
  type ColorValidationResult,
  type ContrastResult,
} from './color-validator';

import {
  validateFontChoice as _validateFontChoice,
  validateFontSizes as _validateFontSizes,
  validateFontPairing as _validateFontPairing,
  type FontSizes,
} from './typography-validator';

import {
  validateSlideContent as _validateSlideContent,
  type SlideContent,
  type DensityValidationResult,
} from './density-validator';

import {
  validateLayout as _validateLayout,
  type LayoutConfig,
  type LayoutValidationResult as _LayoutValidationResult,
} from './layout-validator';

// ── Unified Types ───────────────────────────────────────────

export interface SlideTheme {
  palette: SlidePalette;
  headingFont: string;
  bodyFont: string;
  sizes?: FontSizes;
  layout?: LayoutConfig;
}

export interface DesignValidationResult {
  valid: boolean;
  color: ColorValidationResult;
  textContrast: ContrastResult;
  typography: {
    headingFont: { valid: boolean; suggestion?: string };
    bodyFont: { valid: boolean; suggestion?: string };
    pairing: { valid: boolean; reason?: string };
    sizes: { valid: boolean; violations: string[] };
  };
  density: DensityValidationResult;
  layout: _LayoutValidationResult;
  allViolations: string[];
}

/**
 * Run every constraint validator against a single slide + theme.
 * Returns a unified result with per-domain breakdowns and a
 * flat list of all violations for quick pass/fail checks.
 */
export function validateSlideDesign(
  slide: SlideContent,
  theme: SlideTheme,
): DesignValidationResult {
  // Color
  const colorResult = _validatePalette(theme.palette);
  const textContrastResult = _validateTextContrast(
    theme.palette.text,
    theme.palette.background,
  );

  // Typography
  const headingFontResult = _validateFontChoice(theme.headingFont);
  const bodyFontResult = _validateFontChoice(theme.bodyFont);
  const pairingResult = _validateFontPairing(theme.headingFont, theme.bodyFont);
  const sizesResult = _validateFontSizes(theme.sizes ?? {});

  // Density
  const densityResult = _validateSlideContent(slide);

  // Layout
  const layoutResult = theme.layout
    ? _validateLayout(theme.layout)
    : { valid: true, violations: [] };

  // Flatten all violations
  const allViolations: string[] = [
    ...colorResult.violations,
    ...(textContrastResult.valid
      ? []
      : [`Text contrast ratio ${textContrastResult.ratio}:1 is below required ${textContrastResult.required}:1`]),
    ...(headingFontResult.valid
      ? []
      : [`Heading font "${theme.headingFont}" is not allowed${headingFontResult.suggestion ? `. Try "${headingFontResult.suggestion}"` : ''}`]),
    ...(bodyFontResult.valid
      ? []
      : [`Body font "${theme.bodyFont}" is not allowed${bodyFontResult.suggestion ? `. Try "${bodyFontResult.suggestion}"` : ''}`]),
    ...(pairingResult.valid ? [] : [pairingResult.reason ?? 'Font pairing issue']),
    ...sizesResult.violations,
    ...densityResult.violations,
    ...layoutResult.violations,
  ];

  const valid = allViolations.length === 0;

  return {
    valid,
    color: colorResult,
    textContrast: textContrastResult,
    typography: {
      headingFont: headingFontResult,
      bodyFont: bodyFontResult,
      pairing: pairingResult,
      sizes: sizesResult,
    },
    density: densityResult,
    layout: layoutResult,
    allViolations,
  };
}
