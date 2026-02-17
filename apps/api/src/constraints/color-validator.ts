// ─────────────────────────────────────────────────────────────
// Color Validation Module — Design Constraint Engine
// Handles color-space conversions, Delta-E, WCAG contrast,
// and forbidden-pair enforcement for slide palettes.
// ─────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────

export interface HslColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

export interface ColorValidationResult {
  valid: boolean;
  violations: string[];
}

export interface ContrastResult {
  valid: boolean;
  ratio: number;
  required: number;
}

export interface SlidePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface HslRange {
  hueRanges: Array<[number, number]>;
  minSaturation?: number;
  maxSaturation?: number;
  minLightness?: number;
  maxLightness?: number;
}

interface ForbiddenPair {
  color1Pattern: HslRange;
  color2Pattern: HslRange;
  reason: string;
}

// ── Color Space Conversions ─────────────────────────────────

export function hexToRgb(hex: string): RgbColor {
  const cleaned = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / delta + 2) * 60;
    } else {
      h = ((rNorm - gNorm) / delta + 4) * 60;
    }
  }

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10,
  };
}

export function hslToHex(hsl: HslColor): string {
  const h = hsl.h;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60)       { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else              { r1 = c; g1 = 0; b1 = x; }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function rgbToLab(rgb: RgbColor): LabColor {
  // sRGB -> linear RGB
  let rLin = rgb.r / 255;
  let gLin = rgb.g / 255;
  let bLin = rgb.b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  // Linear RGB -> XYZ (D65 illuminant)
  let x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  let y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750) / 1.00000;
  let z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

  // XYZ -> Lab
  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

// ── Distance & Contrast ─────────────────────────────────────

/** Delta-E CIE76: Euclidean distance in Lab space */
export function deltaE(hex1: string, hex2: string): number {
  const lab1 = rgbToLab(hexToRgb(hex1));
  const lab2 = rgbToLab(hexToRgb(hex2));
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2),
  );
}

/** Relative luminance per WCAG 2.x (0-1) */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const linearize = (channel: number): number => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two colors (1:1 to 21:1) */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  return contrastRatio(hex1, hex2);
}

// ── Forbidden Pairs ─────────────────────────────────────────

function matchesHslRange(hsl: HslColor, range: HslRange): boolean {
  const hueMatch = range.hueRanges.some(
    ([low, high]) => hsl.h >= low && hsl.h <= high,
  );
  if (!hueMatch) return false;

  if (range.minSaturation !== undefined && hsl.s < range.minSaturation) return false;
  if (range.maxSaturation !== undefined && hsl.s > range.maxSaturation) return false;
  if (range.minLightness !== undefined && hsl.l < range.minLightness) return false;
  if (range.maxLightness !== undefined && hsl.l > range.maxLightness) return false;

  return true;
}

export const FORBIDDEN_PAIRS: ForbiddenPair[] = [
  {
    // Red + Green — color-blind inaccessible
    color1Pattern: {
      hueRanges: [[0, 30], [330, 360]],
    },
    color2Pattern: {
      hueRanges: [[90, 150]],
    },
    reason: 'Color-blind inaccessible',
  },
  {
    // Bright Red + Bright Blue — vibration effect
    color1Pattern: {
      hueRanges: [[0, 30]],
      minSaturation: 70,
    },
    color2Pattern: {
      hueRanges: [[210, 270]],
      minSaturation: 70,
    },
    reason: 'Vibration effect, low projected contrast',
  },
  {
    // Orange + Blue (both highly saturated) — eye fatigue
    color1Pattern: {
      hueRanges: [[15, 45]],
      minSaturation: 80,
    },
    color2Pattern: {
      hueRanges: [[210, 270]],
      minSaturation: 80,
    },
    reason: 'Eye fatigue from complementary high-saturation',
  },
  {
    // Neon + Neon — any hue, both high saturation + mid lightness
    color1Pattern: {
      hueRanges: [[0, 360]],
      minSaturation: 90,
      minLightness: 40,
      maxLightness: 70,
    },
    color2Pattern: {
      hueRanges: [[0, 360]],
      minSaturation: 90,
      minLightness: 40,
      maxLightness: 70,
    },
    reason: 'Unprofessional, hurts readability',
  },
];

// ── Validators ──────────────────────────────────────────────

/**
 * Check a single color pair against all forbidden rules.
 * Tests both orderings (color1/color2 and color2/color1).
 */
export function validateColorPair(
  hex1: string,
  hex2: string,
): ColorValidationResult {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  const violations: string[] = [];

  for (const pair of FORBIDDEN_PAIRS) {
    const forwardMatch =
      matchesHslRange(hsl1, pair.color1Pattern) &&
      matchesHslRange(hsl2, pair.color2Pattern);
    const reverseMatch =
      matchesHslRange(hsl2, pair.color1Pattern) &&
      matchesHslRange(hsl1, pair.color2Pattern);

    if (forwardMatch || reverseMatch) {
      violations.push(
        `Forbidden pair (${hex1}, ${hex2}): ${pair.reason}`,
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate every unique pair in a full slide palette.
 */
export function validatePalette(colors: SlidePalette): ColorValidationResult {
  const keys = Object.keys(colors) as Array<keyof SlidePalette>;
  const allViolations: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const result = validateColorPair(colors[keys[i]], colors[keys[j]]);
      if (!result.valid) {
        allViolations.push(
          ...result.violations.map(
            (v) => `[${keys[i]}/${keys[j]}] ${v}`,
          ),
        );
      }
    }
  }

  return { valid: allViolations.length === 0, violations: allViolations };
}

/**
 * WCAG AA text contrast check.
 * Normal text: 4.5:1 minimum.
 * Large text (>=18pt or >=14pt bold): 3:1 minimum.
 */
export function validateTextContrast(
  textColor: string,
  bgColor: string,
  largeText = false,
): ContrastResult {
  const ratio = contrastRatio(textColor, bgColor);
  const required = largeText ? 3.0 : 4.5;
  return {
    valid: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  };
}
