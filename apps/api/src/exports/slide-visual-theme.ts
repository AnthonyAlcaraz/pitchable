/**
 * Shared visual theme module for per-slide background variation
 * and accent color rotation. Used by all 3 exporters (Marp, PptxGenJS, Reveal.js).
 *
 * Design: CSS-only backgrounds using subtle patterns and gradients.
 * No external images, no DB schema changes. Derived from slideType + slideNumber.
 */

import { hexToHsl, hslToHex, contrastRatio } from '../constraints/index.js';

// ── Types ──────────────────────────────────────────────────

export interface ColorPalette {
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
}

export interface BackgroundVariant {
  className: string;
  label: string;
}

type SlideType =
  | 'TITLE'
  | 'PROBLEM'
  | 'SOLUTION'
  | 'ARCHITECTURE'
  | 'PROCESS'
  | 'COMPARISON'
  | 'DATA_METRICS'
  | 'CTA'
  | 'CONTENT'
  | 'QUOTE'
  | 'VISUAL_HUMOR'
  | 'TEAM'
  | 'TIMELINE'
  | 'SECTION_DIVIDER'
  | 'METRICS_HIGHLIGHT'
  | 'FEATURE_GRID'
  | 'PRODUCT_SHOWCASE'
  | 'LOGO_WALL'
  | 'MARKET_SIZING'
  | 'SPLIT_STATEMENT';

// ── Dark Theme Tier System ───────────────────────────────────────

type DarkTier = 'hero' | 'callout' | 'content';

const HERO_TYPES: Set<string> = new Set(['TITLE', 'CTA', 'SECTION_DIVIDER']);
const CALLOUT_TYPES: Set<string> = new Set(['QUOTE', 'METRICS_HIGHLIGHT', 'DATA_METRICS']);

export function getDarkTier(slideType: string): DarkTier {
  if (HERO_TYPES.has(slideType)) return 'hero';
  if (CALLOUT_TYPES.has(slideType)) return 'callout';
  return 'content';
}

// ── Background Variant Pool ────────────────────────────────

const VARIANT_POOL: BackgroundVariant[] = [
  { className: 'bg-radial-glow', label: 'Radial glow bloom' },
  { className: 'bg-diagonal-lines', label: 'Fine diagonal lines' },
  { className: 'bg-wave', label: 'Bottom wave accent' },
  { className: 'bg-subtle-grid', label: 'Dot grid pattern' },
  { className: 'bg-circuit', label: 'Circuit trace pattern' },
  { className: 'bg-corner-accent', label: 'Corner accent glow' },
  { className: 'bg-mesh-gradient', label: 'Conic mesh gradient' },
  { className: 'bg-noise-texture', label: 'Noise texture overlay' },
];

// ── Slide Type → Variant Mapping (Dark Themes) ──────────────

const TYPE_TO_VARIANT: Record<SlideType, number | 'cycle'> = {
  TITLE: 0,         // bg-radial-glow
  CTA: 0,           // bg-radial-glow
  PROBLEM: 1,       // bg-diagonal-lines
  SOLUTION: 2,      // bg-wave
  ARCHITECTURE: 3,  // bg-subtle-grid
  PROCESS: 3,       // bg-subtle-grid
  DATA_METRICS: 4,  // bg-circuit
  COMPARISON: 1,    // bg-diagonal-lines
  CONTENT: 'cycle', // rotates through all 6
  QUOTE: 5,         // bg-corner-accent
  VISUAL_HUMOR: 0,   // bg-radial-glow (subtle, image dominates)
  TEAM: 5,            // bg-corner-accent
  TIMELINE: 2,        // bg-wave
  SECTION_DIVIDER: 0, // bg-radial-glow (overridden by spot directives)
  METRICS_HIGHLIGHT: 4, // bg-circuit
  FEATURE_GRID: 3,    // bg-subtle-grid
  PRODUCT_SHOWCASE: 2,   // bg-wave (product image dominates, subtle bg)
  LOGO_WALL: 5,          // bg-corner-accent
  MARKET_SIZING: 4,      // bg-circuit (data-oriented)
  SPLIT_STATEMENT: 1,    // bg-diagonal-lines (editorial feel)
};

// ── Light-Background Variant Pool (McKinsey / Consulting) ───

const LIGHT_VARIANT_POOL: BackgroundVariant[] = [
  { className: 'bg-clean', label: 'Clean white' },
  { className: 'bg-section-divider', label: 'Navy section divider' },
  { className: 'bg-callout', label: 'Light blue callout' },
  { className: 'bg-warm-cream', label: 'Warm cream paper' },
  { className: 'bg-soft-gradient', label: 'Soft vertical gradient' },
  { className: 'bg-accent-tint', label: 'Accent tint' },
];

const LIGHT_TYPE_TO_VARIANT: Record<SlideType, number> = {
  TITLE: 1,          // bg-section-divider (navy)
  CTA: 1,            // bg-section-divider (navy)
  QUOTE: 2,          // bg-callout (ice blue)
  PROBLEM: 5,        // bg-accent-tint
  SOLUTION: 4,        // bg-soft-gradient
  ARCHITECTURE: 4,   // bg-soft-gradient
  PROCESS: 4,        // bg-soft-gradient
  DATA_METRICS: 5,   // bg-accent-tint
  COMPARISON: 4,     // bg-soft-gradient
  CONTENT: 0,
  VISUAL_HUMOR: 0,  // bg-clean (image dominates)
  TEAM: 3,           // bg-warm-cream
  TIMELINE: 0,        // bg-clean
  SECTION_DIVIDER: 1, // bg-section-divider
  METRICS_HIGHLIGHT: 2, // bg-callout
  FEATURE_GRID: 3,   // bg-warm-cream
  PRODUCT_SHOWCASE: 0,    // bg-clean (product image carries visual weight)
  LOGO_WALL: 0,           // bg-clean
  MARKET_SIZING: 5,       // bg-accent-tint
  SPLIT_STATEMENT: 4,     // bg-soft-gradient
};


// ── Background Color Variation (Analogous Hue Shifts) ─────

/**
 * Map background variant index → shade index for color variation.
 * Shade 0 = base hue (TITLE, CTA)
 * Shade 1 = +10 hue, +2% lightness (slightly teal)
 * Shade 2 = -8 hue, +1% lightness (slightly indigo)
 * Shade 3 = +5 hue, +3% lightness (warm shift)
 */
const VARIANT_TO_SHADE: Record<number, number> = {
  0: 0, // bg-radial-glow → base (TITLE, CTA)
  1: 1, // bg-diagonal-lines → shade 1 (PROBLEM)
  2: 2, // bg-wave → shade 2 (SOLUTION, TIMELINE)
  3: 3, // bg-subtle-grid → shade 3 (ARCHITECTURE, PROCESS, FEATURE_GRID)
  4: 1, // bg-circuit → shade 1 (DATA_METRICS, METRICS_HIGHLIGHT)
  5: 2, // bg-corner-accent → shade 2 (QUOTE, TEAM)
  6: 3, // bg-mesh-gradient → shade 3
  7: 0, // bg-noise-texture → shade 0 (base)
};

/**
 * Generate 4 background shade variations from a base color using
 * analogous HSL shifts. Each shade is validated for contrast against textColor.
 * Falls back to original bg if contrast breaks.
 */
export function generateBackgroundShades(bg: string, textColor: string): string[] {
  const base = hexToHsl(bg);
  const shifts: Array<{ hDelta: number; lDelta: number }> = [
    { hDelta: 0, lDelta: 0 },     // Shade 0: base
    { hDelta: 10, lDelta: 2 },    // Shade 1: teal shift
    { hDelta: -8, lDelta: 1 },    // Shade 2: indigo shift
    { hDelta: 5, lDelta: 3 },     // Shade 3: warm shift
  ];

  return shifts.map(({ hDelta, lDelta }) => {
    const shifted = hslToHex({
      h: ((base.h + hDelta) % 360 + 360) % 360,
      s: base.s,
      l: Math.min(100, base.l + lDelta),
    });
    // Validate contrast — fall back to original if it breaks
    if (contrastRatio(shifted, textColor) < 4.5) {
      return bg;
    }
    return shifted;
  });
}

// ── Public API ─────────────────────────────────────────────

export function getSlideBackground(
  slideType: string,
  slideNumber: number,
  bgColor?: string,
): BackgroundVariant {
  const useLightVariants = bgColor ? !isDarkBg(bgColor) : false;

  if (useLightVariants) {
    const mapping = LIGHT_TYPE_TO_VARIANT[slideType as SlideType];
    return LIGHT_VARIANT_POOL[mapping ?? 0];
  }

  // Dark theme tier system: hero / callout / content
  const tier = getDarkTier(slideType);
  if (tier === 'hero') {
    return { className: 'bg-hero', label: 'Hero solid color' };
  }
  if (tier === 'callout') {
    return { className: 'bg-callout-dark', label: 'Callout surface' };
  }

  const mapping = TYPE_TO_VARIANT[slideType as SlideType];
  if (mapping === undefined || mapping === 'cycle') {
    return VARIANT_POOL[slideNumber % VARIANT_POOL.length];
  }
  return VARIANT_POOL[mapping];
}

export function getSlideAccentColor(
  slideNumber: number,
  palette: ColorPalette,
): string {
  const accents = [palette.accent, palette.primary, palette.success, palette.secondary];
  return accents[slideNumber % accents.length];
}

// ── Color Helpers ──────────────────────────────────────────

function hexToRgba(color: string, alpha: number): string {
  const c = color.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isDarkBg(bg: string): boolean {
  const c = bg.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

/** Get the appropriate hero background color for dark themes.
 *  If primary is too light (e.g. white in dark-professional), use accent instead.
 */
export function getHeroBackground(palette: ColorPalette): string {
  const c = palette.primary.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 180 ? palette.accent : palette.primary;
}

function patternColor(bg: string, opacity: number): string {
  return isDarkBg(bg)
    ? `rgba(255,255,255,${opacity})`
    : `rgba(0,0,0,${opacity})`;
}

// ── Marp CSS Generation ────────────────────────────────────

function waveSvg(color: string): string {
  const c = color.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 80'>`
    + `<path fill='rgba(${r},${g},${b},0.06)' d='M0,48 C360,80 720,16 1080,48 C1260,64 1380,40 1440,48 L1440,80 L0,80Z'/>`
    + `</svg>`,
  );
}

function waveSvgSmall(color: string): string {
  const c = color.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 40'>`
    + `<path fill='rgba(${r},${g},${b},0.03)' d='M0,24 C480,40 960,8 1440,24 L1440,40 L0,40Z'/>`
    + `</svg>`,
  );
}

function circuitSvg(bg: string): string {
  const pc = isDarkBg(bg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>`
    + `<line x1='20' y1='20' x2='80' y2='20' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='80' y1='20' x2='80' y2='80' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='80' cy='80' r='3' fill='${pc}'/>`
    + `<line x1='80' y1='80' x2='140' y2='80' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='140' y1='80' x2='140' y2='40' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='140' cy='40' r='3' fill='${pc}'/>`
    + `<line x1='120' y1='60' x2='180' y2='60' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='120' y1='60' x2='120' y2='140' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='120' cy='140' r='3' fill='${pc}'/>`
    + `<line x1='40' y1='120' x2='40' y2='180' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='40' y1='180' x2='160' y2='180' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='160' cy='180' r='3' fill='${pc}'/>`
    + `<line x1='160' y1='180' x2='160' y2='140' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='20' y1='100' x2='60' y2='100' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='60' y1='100' x2='60' y2='160' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='60' cy='160' r='3' fill='${pc}'/>`
    + `<line x1='100' y1='20' x2='180' y2='20' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='180' y1='20' x2='180' y2='100' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='180' cy='100' r='3' fill='${pc}'/>`
    + `<line x1='20' y1='160' x2='100' y2='160' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='100' cy='160' r='3' fill='${pc}'/>`
    + `<line x1='100' y1='160' x2='100' y2='120' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='60' y1='40' x2='60' y2='80' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='60' cy='40' r='2' fill='${pc}'/>`
    + `<line x1='140' y1='140' x2='180' y2='140' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='180' cy='140' r='2' fill='${pc}'/>`
    + `</svg>`,
  );
}


/** Darken a hex color slightly for gradient end-point. */
function darkenForGradient(hex: string): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 15);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 15);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 15);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate Marp CSS for all 6 background variant classes.
 * Each class provides its own background, replacing the global gradient.
 */
export function generateMarpBackgroundCSS(
  palette: ColorPalette,
  bg: string,
  gradientEnd: string,
  bgShades?: string[],
): string {
  const baseGrad = `linear-gradient(135deg, ${bg} 0%, ${gradientEnd} 100%)`;

  // Per-variant gradient function: uses shade if available
  function variantGrad(variantIdx: number): string {
    if (!bgShades) return baseGrad;
    const shadeIdx = VARIANT_TO_SHADE[variantIdx] ?? 0;
    const shadeBg = bgShades[shadeIdx] ?? bg;
    const shadeEnd = darkenForGradient(shadeBg);
    return `linear-gradient(135deg, ${shadeBg} 0%, ${shadeEnd} 100%)`;
  }
  const pc = patternColor(bg, 0.06);
  const accentRgba = hexToRgba(palette.primary, 0.08);
  const accentCorner = hexToRgba(palette.accent, 0.06);

  // AMI Labs bokeh colors at visible opacity
  const bokehPrimary = hexToRgba(palette.primary, 0.22);
  const bokehAccent = hexToRgba(palette.accent, 0.18);
  const bokehSecondary = hexToRgba(palette.secondary || palette.primary, 0.14);

  const lines: string[] = [];

  // 0. bg-radial-glow — AMI Labs multi-blob bokeh effect
  lines.push(`  section.bg-radial-glow {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(ellipse 600px 500px at 15% 60%, ${bokehPrimary} 0%, transparent 70%),`);
  lines.push(`      radial-gradient(ellipse 500px 400px at 80% 25%, ${bokehAccent} 0%, transparent 70%),`);
  lines.push(`      radial-gradient(ellipse 350px 350px at 50% 85%, ${bokehSecondary} 0%, transparent 65%),`);
  lines.push(`      radial-gradient(ellipse 280px 280px at 70% 65%, ${hexToRgba(palette.success || palette.primary, 0.10)} 0%, transparent 60%),`);
  lines.push(`      radial-gradient(ellipse 200px 250px at 30% 20%, ${hexToRgba(palette.warning || palette.accent, 0.08)} 0%, transparent 55%),`);
  lines.push(`      ${baseGrad};`);
  lines.push(`  }`);

  // 1. bg-diagonal-lines — triple-line pattern
  lines.push(`  section.bg-diagonal-lines {`);
  lines.push(`    background:`);
  lines.push(`      repeating-linear-gradient(45deg, transparent, transparent 14px, ${pc} 14px, ${pc} 15px),`);
  lines.push(`      repeating-linear-gradient(135deg, transparent, transparent 20px, ${hexToRgba(palette.primary, 0.03)} 20px, ${hexToRgba(palette.primary, 0.03)} 21px),`);
  lines.push(`      repeating-linear-gradient(30deg, transparent, transparent 27px, ${hexToRgba(palette.accent, 0.02)} 27px, ${hexToRgba(palette.accent, 0.02)} 28px),`);
  lines.push(`      ${variantGrad(1)};`);
  lines.push(`  }`);

  // 2. bg-wave — triple layered waves
  lines.push(`  section.bg-wave {`);
  lines.push(`    background:`);
  lines.push(`      url("data:image/svg+xml,${waveSvg(palette.accent)}") no-repeat bottom center / 100% 80px,`);
  lines.push(`      url("data:image/svg+xml,${waveSvg(palette.primary)}") no-repeat bottom 20px center / 100% 60px,`);
  lines.push(`      url("data:image/svg+xml,${waveSvgSmall(palette.secondary || palette.primary)}") no-repeat bottom 50px center / 100% 40px,`);
  lines.push(`      ${variantGrad(2)};`);
  lines.push(`  }`);

  // 3. bg-subtle-grid — isometric dot grid with junction highlights
  lines.push(`  section.bg-subtle-grid {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(circle 2px at 30px 30px, ${hexToRgba(palette.accent, 0.08)} 0%, transparent 100%),`);
  lines.push(`      radial-gradient(circle, ${pc} 1px, transparent 1px),`);
  lines.push(`      linear-gradient(0deg, transparent 29px, ${hexToRgba(palette.primary, 0.02)} 29px, ${hexToRgba(palette.primary, 0.02)} 30px, transparent 30px),`);
  lines.push(`      linear-gradient(90deg, transparent 29px, ${hexToRgba(palette.primary, 0.02)} 29px, ${hexToRgba(palette.primary, 0.02)} 30px, transparent 30px),`);
  lines.push(`      ${variantGrad(3)};`);
  lines.push(`    background-size: 60px 60px, 30px 30px, 30px 30px, 30px 30px, 100% 100%;`);
  lines.push(`  }`);

  // 4. bg-circuit — trace pattern
  lines.push(`  section.bg-circuit {`);
  lines.push(`    background: url("data:image/svg+xml,${circuitSvg(bg)}") repeat, ${variantGrad(4)};`);
  lines.push(`    background-size: 200px 200px, 100% 100%;`);
  lines.push(`  }`);

  // 5. bg-corner-accent — corner gradient wedge + mesh orb + conic mesh
  lines.push(`  section.bg-corner-accent {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(ellipse 400px 350px at 85% 15%, ${bokehAccent} 0%, transparent 65%),`);
  lines.push(`      radial-gradient(ellipse 300px 300px at 20% 75%, ${bokehPrimary} 0%, transparent 70%),`);
  lines.push(`      conic-gradient(from 180deg at 50% 50%, ${hexToRgba(palette.primary, 0.04)}, transparent, ${hexToRgba(palette.accent, 0.03)}, transparent),`);
  lines.push(`      linear-gradient(225deg, ${hexToRgba(palette.accent, 0.08)} 0%, transparent 30%),`);
  lines.push(`      ${variantGrad(5)};`);
  lines.push(`  }`);

  // 6. bg-mesh-gradient — CSS dual conic-gradient mesh
  lines.push(`  section.bg-mesh-gradient {`);
  lines.push(`    background:`);
  lines.push(`      conic-gradient(from 45deg at 30% 40%, ${hexToRgba(palette.primary, 0.08)}, ${hexToRgba(palette.accent, 0.06)}, ${hexToRgba(palette.secondary || palette.primary, 0.04)}, ${hexToRgba(palette.primary, 0.08)}),`);
  lines.push(`      conic-gradient(from 200deg at 70% 60%, ${hexToRgba(palette.accent, 0.06)}, ${hexToRgba(palette.primary, 0.04)}, ${hexToRgba(palette.secondary || palette.primary, 0.03)}, ${hexToRgba(palette.accent, 0.06)}),`);
  lines.push(`      ${baseGrad};`);
  lines.push(`  }`);

  // 7. bg-noise-texture — SVG turbulence filter + gradient base + radial overlay
  // NOTE: Both decorative overlays use ::before only (::after is reserved for Marp pagination)
  lines.push(`  section.bg-noise-texture {`);
  lines.push(`    background: ${baseGrad};`);
  lines.push(`    position: relative;`);
  lines.push(`  }`);
  lines.push(`  section.bg-noise-texture::before {`);
  lines.push(`    content: '';`);
  lines.push(`    position: absolute;`);
  lines.push(`    inset: 0;`);
  lines.push(`    background: radial-gradient(ellipse 600px 400px at 60% 40%, ${hexToRgba(palette.primary, 0.06)} 0%, transparent 70%), url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.03'/></svg>`)}");`);
  lines.push(`    mix-blend-mode: overlay;`);
  lines.push(`    pointer-events: none;`);
  lines.push(`  }`);


  // ── Boosted-opacity overrides for image-free slides ────────
  // When a slide has no image, patterns at 0.06 opacity are invisible.
  // The .no-image class doubles pattern visibility and adds an accent border.
  const pcBoosted = patternColor(bg, 0.22);
  const bokehPrimaryBoosted = hexToRgba(palette.primary, 0.42);
  const bokehAccentBoosted = hexToRgba(palette.accent, 0.35);
  const bokehSecondaryBoosted = hexToRgba(palette.secondary || palette.primary, 0.28);

  lines.push(`  section.no-image { border-top: 4px solid ${palette.accent}; }`);

  // bg-radial-glow boosted
  lines.push(`  section.bg-radial-glow.no-image {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(ellipse 600px 500px at 15% 60%, ${bokehPrimaryBoosted} 0%, transparent 70%),`);
  lines.push(`      radial-gradient(ellipse 500px 400px at 80% 25%, ${bokehAccentBoosted} 0%, transparent 70%),`);
  lines.push(`      radial-gradient(ellipse 350px 350px at 50% 85%, ${bokehSecondaryBoosted} 0%, transparent 65%),`);
  lines.push(`      ${baseGrad};`);
  lines.push(`  }`);

  // bg-diagonal-lines boosted
  lines.push(`  section.bg-diagonal-lines.no-image {`);
  lines.push(`    background:`);
  lines.push(`      repeating-linear-gradient(45deg, transparent, transparent 14px, ${pcBoosted} 14px, ${pcBoosted} 15px),`);
  lines.push(`      repeating-linear-gradient(135deg, transparent, transparent 20px, ${hexToRgba(palette.primary, 0.06)} 20px, ${hexToRgba(palette.primary, 0.06)} 21px),`);
  lines.push(`      ${variantGrad(1)};`);
  lines.push(`  }`);

  // bg-wave boosted
  lines.push(`  section.bg-wave.no-image {`);
  lines.push(`    background:`);
  lines.push(`      url("data:image/svg+xml,${waveSvg(palette.accent)}") no-repeat bottom center / 100% 80px,`);
  lines.push(`      url("data:image/svg+xml,${waveSvg(palette.primary)}") no-repeat bottom 20px center / 100% 60px,`);
  lines.push(`      ${variantGrad(2)};`);
  lines.push(`  }`);

  // bg-subtle-grid boosted
  lines.push(`  section.bg-subtle-grid.no-image {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(circle 2px at 30px 30px, ${hexToRgba(palette.accent, 0.14)} 0%, transparent 100%),`);
  lines.push(`      radial-gradient(circle, ${pcBoosted} 1px, transparent 1px),`);
  lines.push(`      ${variantGrad(3)};`);
  lines.push(`    background-size: 60px 60px, 30px 30px, 100% 100%;`);
  lines.push(`  }`);

  // bg-circuit boosted
  lines.push(`  section.bg-circuit.no-image {`);
  lines.push(`    background: url("data:image/svg+xml,${circuitSvg(bg)}") repeat, ${variantGrad(4)};`);
  lines.push(`    background-size: 180px 180px, 100% 100%;`);
  lines.push(`  }`);

  // bg-corner-accent boosted
  lines.push(`  section.bg-corner-accent.no-image {`);
  lines.push(`    background:`);
  lines.push(`      radial-gradient(ellipse 400px 350px at 85% 15%, ${bokehAccentBoosted} 0%, transparent 65%),`);
  lines.push(`      radial-gradient(ellipse 300px 300px at 20% 75%, ${bokehPrimaryBoosted} 0%, transparent 70%),`);
  lines.push(`      ${variantGrad(5)};`);
  lines.push(`  }`);

  // bg-mesh-gradient boosted
  lines.push(`  section.bg-mesh-gradient.no-image {`);
  lines.push(`    background:`);
  lines.push(`      conic-gradient(from 45deg at 30% 40%, ${hexToRgba(palette.primary, 0.14)}, ${hexToRgba(palette.accent, 0.10)}, ${hexToRgba(palette.secondary || palette.primary, 0.08)}, ${hexToRgba(palette.primary, 0.14)}),`);
  lines.push(`      ${baseGrad};`);
  lines.push(`  }`);


  return lines.join('\n');
}

/**
 * Generate Marp CSS for accent color rotation on bold text within bullets.
 */
export function generateMarpAccentRotationCSS(
  safeAccent: string,
  safePrimary: string,
  safeSuccess: string,
  safeSecondary: string,
): string {
  return [
    `  section li:nth-child(4n+1) strong { color: ${safeAccent}; }`,
    `  section li:nth-child(4n+2) strong { color: ${safePrimary}; }`,
    `  section li:nth-child(4n+3) strong { color: ${safeSuccess}; }`,
    `  section li:nth-child(4n+4) strong { color: ${safeSecondary}; }`,
  ].join('\n');
}

/**
 * Generate enhanced section.lead CSS with decorative elements.
 * For dark themes: ensures all text in lead slides is white/light for readability.
 */
export function generateLeadEnhancementCSS(safeAccent: string, safeText: string): string {
  return [
    `  section.lead {`,
    `    text-align: center;`,
    `    display: flex;`,
    `    flex-direction: column;`,
    `    justify-content: center;`,
    `  }`,
    `  section.lead h1 {`,
    `    font-size: 2.2em;`,
    `    color: #FFFFFF;`,
    `  }`,
    `  section.lead h2, section.lead h3 {`,
    `    color: rgba(255,255,255,0.85);`,
    `  }`,
    `  section.lead p, section.lead li {`,
    `    color: rgba(255,255,255,0.9);`,
    `    font-size: 1.2em;`,
    `    text-align: center;`,
    `  }`,
    `  section.lead strong {`,
    `    color: ${safeAccent};`,
    `  }`,
    `  section.lead h1::after { margin: 6px auto 0; }`,
    `  section.lead::before {`,
    `    content: '';`,
    `    position: absolute;`,
    `    bottom: 0; left: 0; right: 0;`,
    `    height: 100px;`,
    `    background: linear-gradient(to top, rgba(0,0,0,0.12), transparent);`,
    `    pointer-events: none;`,
    `    z-index: 0;`,
    `  }`,
  ].join('\n');
}

// ── McKinsey / Light-Background CSS Generation ──────────────

/**
 * Generate Marp CSS for McKinsey-style light-background themes.
 * Clean white, navy section dividers, ice blue callout, blue separator.
 */
export function generateMarpMcKinseyCSS(palette: ColorPalette): string {
  const navy = palette.primary;
  const blue = palette.accent;

  return [
    `  section.bg-clean { background: ${palette.background} !important; }`,
    `  section.bg-section-divider {`,
    `    background: ${navy} !important;`,
    `    color: #FFFFFF !important;`,
    `  }`,
    `  section.bg-section-divider h1,`,
    `  section.bg-section-divider h2,`,
    `  section.bg-section-divider h3,`,
    `  section.bg-section-divider p,`,
    `  section.bg-section-divider li { color: #FFFFFF !important; }`,
    `  section.bg-section-divider strong { color: #FFFFFF !important; }`,
    `  section.bg-callout { background: #EBF2FA !important; }`,
    `  section hr {`,
    `    border: none;`,
    `    border-top: 4px solid ${blue};`,
    `    margin: 0.2em 0 0.6em 0;`,
    `    width: 60px;`,
    `  }`,
    `  section li strong { color: ${navy}; }`,
    `  section blockquote {`,
    `    background: #EBF2FA;`,
    `    border-left: 3px solid ${blue};`,
    `    border-radius: 0;`,
    `    padding: 12px 16px;`,
    `    font-size: 0.85em;`,
    `    color: ${palette.text};`,
    `  }`,
    `  section.bg-warm-cream { background: #FBF8F3 !important; }`,
    `  section.bg-soft-gradient { background: linear-gradient(180deg, ${palette.background} 0%, ${palette.surface} 100%) !important; }`,
    `  section.bg-accent-tint { background: ${hexToRgba(palette.accent, 0.05)} !important; }`,
    `  .glass-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 12px rgba(0,0,0,0.05); border-radius: 12px; padding: 20px 24px; }`,
  ].join('\n');
}

/**
 * Generate Marp CSS for McKinsey-style tables.
 * Navy header, horizontal-only borders, alternating rows.
 */
export function generateMarpMcKinseyTableCSS(palette: ColorPalette): string {
  return [
    `  table { border-collapse: collapse; width: auto; min-width: 70%; max-width: 100%; margin-left: auto; margin-right: auto; font-size: 0.82em; margin-top: 0.3em; margin-bottom: 0.3em; }`,
    `  th {`,
    `    background: ${palette.primary};`,
    `    color: #FFFFFF;`,
    `    padding: 5px 10px;`,
    `    border: none;`,
    `    border-bottom: 2px solid ${palette.primary};`,
    `    font-weight: bold;`,
    `    text-align: left;`,
    `  }`,
    `  td {`,
    `    padding: 5px 10px;`,
    `    border: none;`,
    `    border-bottom: 1px solid #E5E5E5;`,
    `    color: ${palette.text};`,
    `  }`,
    `  tr:nth-child(even) td { background: #F5F5F5; }`,
    `  tr:nth-child(odd) td { background: #FFFFFF; }`,
  ].join('\n');
}

/**
 * Generate Marp section.lead CSS for McKinsey themes.
 * Navy background, white centered text — used for TITLE/CTA divider slides.
 */
export function generateMarpMcKinseyLeadCSS(palette: ColorPalette): string {
  return [
    `  section.lead {`,
    `    background: ${palette.primary} !important;`,
    `    color: #FFFFFF !important;`,
    `    text-align: center;`,
    `    display: flex;`,
    `    flex-direction: column;`,
    `    justify-content: center;`,
    `  }`,
    `  section.lead h1 {`,
    `    color: #FFFFFF !important;`,
    `    font-size: 2.4em;`,
    `  }`,
    `  section.lead h2 {`,
    `    color: rgba(255,255,255,0.8) !important;`,
    `  }`,
    `  section.lead p, section.lead li {`,
    `    color: rgba(255,255,255,0.9) !important;`,
    `  }`,
    `  section.lead h1::after { margin: 6px auto 0; background: ${palette.accent}; }`,
  ].join('\n');
}

/**
 * Generate Marp CSS for dark theme tier system.
 * Hero: primary-color bg with all-white text.
 * Callout: surface bg with accent top border.
 */
export function generateMarpDarkTierCSS(palette: ColorPalette): string {
  const heroBg = getHeroBackground(palette);
  return [
    `  section.bg-hero {`,
    `    background: linear-gradient(135deg, ${heroBg} 0%, ${darkenForGradient(heroBg)} 60%, ${hexToRgba(palette.accent, 0.15)} 100%) !important;`,
    `    color: #FFFFFF !important;`,
    `    text-align: center;`,
    `    display: flex;`,
    `    flex-direction: column;`,
    `    justify-content: center;`,
    `  }`,
    `  section.bg-hero h1,`,
    `  section.bg-hero h2,`,
    `  section.bg-hero h3 { color: #FFFFFF !important; }`,
    `  section.bg-hero h1::after { content: ''; display: block; width: 60px; height: 3px; background: ${palette.accent}; margin: 8px auto 0; border-radius: 2px; }`,
    `  section.bg-hero p, section.bg-hero li { color: rgba(255,255,255,0.9) !important; }`,
    `  section.bg-hero strong { color: #FFFFFF !important; }`,
    `  section.bg-callout-dark {`,
    `    background: ${palette.surface} !important;`,
    `    color: ${palette.text} !important;`,
    `    border-top: 4px solid ${palette.accent};`,
    `  }`,
    `  section.bg-radial-glow { color: ${palette.text} !important; }`,
    `  section.bg-radial-glow h1 { color: ${palette.primary} !important; }`,
    `  section.bg-diagonal-lines { color: ${palette.text} !important; }`,
    `  section.bg-diagonal-lines h1 { color: ${palette.primary} !important; }`,
    `  section.bg-wave { color: ${palette.text} !important; }`,
    `  section.bg-wave h1 { color: ${palette.primary} !important; }`,
    `  section.bg-subtle-grid { color: ${palette.text} !important; }`,
    `  section.bg-subtle-grid h1 { color: ${palette.primary} !important; }`,
    `  section.bg-circuit { color: ${palette.text} !important; }`,
    `  section.bg-circuit h1 { color: ${palette.primary} !important; }`,
    `  section.bg-corner-accent { color: ${palette.text} !important; }`,
    `  section.bg-corner-accent h1 { color: ${palette.primary} !important; }`,
    `  section.bg-mesh-gradient { color: ${palette.text} !important; }`,
    `  section.bg-mesh-gradient h1 { color: ${palette.primary} !important; }`,
    `  section.bg-noise-texture { color: ${palette.text} !important; }`,
    `  section.bg-noise-texture h1 { color: ${palette.primary} !important; }`,
    // Ensure ALL text elements in dark background variants have readable colors
    `  section.bg-radial-glow h2, section.bg-radial-glow h3, section.bg-radial-glow p, section.bg-radial-glow li, section.bg-radial-glow strong { color: ${palette.text} !important; }`,
    `  section.bg-diagonal-lines h2, section.bg-diagonal-lines h3, section.bg-diagonal-lines p, section.bg-diagonal-lines li, section.bg-diagonal-lines strong { color: ${palette.text} !important; }`,
    `  section.bg-wave h2, section.bg-wave h3, section.bg-wave p, section.bg-wave li, section.bg-wave strong { color: ${palette.text} !important; }`,
    `  section.bg-subtle-grid h2, section.bg-subtle-grid h3, section.bg-subtle-grid p, section.bg-subtle-grid li, section.bg-subtle-grid strong { color: ${palette.text} !important; }`,
    `  section.bg-circuit h2, section.bg-circuit h3, section.bg-circuit p, section.bg-circuit li, section.bg-circuit strong { color: ${palette.text} !important; }`,
    `  section.bg-corner-accent h2, section.bg-corner-accent h3, section.bg-corner-accent p, section.bg-corner-accent li, section.bg-corner-accent strong { color: ${palette.text} !important; }`,
    `  section.bg-mesh-gradient h2, section.bg-mesh-gradient h3, section.bg-mesh-gradient p, section.bg-mesh-gradient li, section.bg-mesh-gradient strong { color: ${palette.text} !important; }`,
    `  section.bg-noise-texture h2, section.bg-noise-texture h3, section.bg-noise-texture p, section.bg-noise-texture li, section.bg-noise-texture strong { color: ${palette.text} !important; }`,
    // Callout-dark tier also needs explicit text color for all elements
    `  section.bg-callout-dark h1 { color: ${palette.primary} !important; }`,
    `  section.bg-callout-dark h2, section.bg-callout-dark h3, section.bg-callout-dark p, section.bg-callout-dark li { color: ${palette.text} !important; }`,
    `  section.bg-callout-dark strong { color: ${palette.accent} !important; }`,
    `  .glass-card { background: rgba(255,255,255,0.07); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 4px 30px rgba(0,0,0,0.15); border-radius: 16px; padding: 20px 24px; }`,
  ].join('\n');
}

/**
 * Generate Reveal.js CSS for McKinsey-style light-background themes.
 */
export function generateRevealMcKinseyCSS(palette: ColorPalette): string {
  const navy = palette.primary;
  const blue = palette.accent;

  return [
    `.reveal .slides section.bg-clean { background: ${palette.background}; }`,
    `.reveal .slides section.bg-section-divider { background: ${navy}; color: #FFFFFF; }`,
    `.reveal .slides section.bg-section-divider h1,`,
    `.reveal .slides section.bg-section-divider h2,`,
    `.reveal .slides section.bg-section-divider h3,`,
    `.reveal .slides section.bg-section-divider p,`,
    `.reveal .slides section.bg-section-divider li { color: #FFFFFF; }`,
    `.reveal .slides section.bg-callout { background: #EBF2FA; }`,
    `.reveal li strong { color: ${navy}; }`,
    `.reveal table th { background: ${navy}; color: #FFFFFF; border: none; border-bottom: 2px solid ${navy}; }`,
    `.reveal table td { border: none; border-bottom: 1px solid #E5E5E5; }`,
    `.reveal table tr:nth-child(even) td { background: #F5F5F5; }`,
    `.reveal blockquote { background: #EBF2FA; border-left: 3px solid ${blue}; border-radius: 0; }`,
  ].join('\n    ');
}

// ── Reveal.js CSS Generation ───────────────────────────────

export function generateRevealBackgroundCSS(
  palette: ColorPalette,
  bg: string,
  gradientEnd: string,
): string {
  const baseGrad = `linear-gradient(135deg, ${bg} 0%, ${gradientEnd} 100%)`;
  const pc = patternColor(bg, 0.06);
  const accentRgba = hexToRgba(palette.primary, 0.08);
  const accentCorner = hexToRgba(palette.accent, 0.06);

  return [
    `.reveal .slides section.bg-radial-glow { background: radial-gradient(ellipse at 30% 50%, ${accentRgba} 0%, transparent 70%), ${baseGrad}; }`,
    `.reveal .slides section.bg-diagonal-lines { background: repeating-linear-gradient(45deg, transparent, transparent 14px, ${pc} 14px, ${pc} 15px), ${baseGrad}; }`,
    `.reveal .slides section.bg-wave { background: url("data:image/svg+xml,${waveSvg(palette.accent)}") no-repeat bottom center / 100% 80px, ${baseGrad}; }`,
    `.reveal .slides section.bg-subtle-grid { background: radial-gradient(circle, ${pc} 1px, transparent 1px) 0 0 / 30px 30px, ${baseGrad}; }`,
    `.reveal .slides section.bg-circuit { background: url("data:image/svg+xml,${circuitSvg(bg)}") repeat 0 0 / 200px 200px, ${baseGrad}; }`,
    `.reveal .slides section.bg-corner-accent { background: linear-gradient(225deg, ${accentCorner} 0%, transparent 40%), ${baseGrad}; }`,
  ].join('\n    ');
}

export function generateRevealAccentRotationCSS(
  safeAccent: string,
  safePrimary: string,
  safeSuccess: string,
  safeSecondary: string,
): string {
  return [
    `.reveal li:nth-child(4n+1) strong { color: ${safeAccent}; }`,
    `.reveal li:nth-child(4n+2) strong { color: ${safePrimary}; }`,
    `.reveal li:nth-child(4n+3) strong { color: ${safeSuccess}; }`,
    `.reveal li:nth-child(4n+4) strong { color: ${safeSecondary}; }`,
  ].join('\n    ');
}

// ── PptxGenJS Helpers ──────────────────────────────────────

export interface PptxDecorationShape {
  type: 'ellipse' | 'triangle' | 'line' | 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: { color: string; transparency: number };
  line?: { color: string; width: number; transparency: number };
  rotate?: number;
}

/**
 * Get decorative shapes for a background variant in PptxGenJS format.
 * Returns 0-2 shapes per variant. All shapes use high transparency (>90%).
 */
export function getPptxDecorations(
  slideType: string,
  slideNumber: number,
  palette: ColorPalette,
): PptxDecorationShape[] {
  const variant = getSlideBackground(slideType, slideNumber);
  const pHex = palette.primary.replace('#', '');
  const aHex = palette.accent.replace('#', '');

  switch (variant.className) {
    case 'bg-radial-glow':
      return [{
        type: 'ellipse',
        x: 0.5, y: 1.0, w: 5.5, h: 5.5,
        fill: { color: pHex, transparency: 94 },
      }];

    case 'bg-corner-accent':
      return [{
        type: 'triangle',
        x: 10.5, y: -0.5, w: 3.5, h: 2.5,
        fill: { color: aHex, transparency: 92 },
        rotate: 0,
      }];

    case 'bg-diagonal-lines':
      return [
        { type: 'line', x: 0, y: 0, w: 13.33, h: 7.5, line: { color: pHex, width: 0.5, transparency: 96 } },
        { type: 'line', x: 2, y: 0, w: 13.33, h: 7.5, line: { color: pHex, width: 0.5, transparency: 96 } },
      ];

    case 'bg-wave':
      return [{
        type: 'rect',
        x: 0, y: 6.8, w: 13.33, h: 0.7,
        fill: { color: aHex, transparency: 95 },
      }];

    default:
      // bg-subtle-grid, bg-circuit — no easy PptxGenJS equivalent, skip
      return [];
  }
}

