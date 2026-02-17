/**
 * Shared visual theme module for per-slide background variation
 * and accent color rotation. Used by all 3 exporters (Marp, PptxGenJS, Reveal.js).
 *
 * Design: CSS-only backgrounds using subtle patterns and gradients.
 * No external images, no DB schema changes. Derived from slideType + slideNumber.
 */

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
  | 'VISUAL_HUMOR';

// ── Background Variant Pool ────────────────────────────────

const VARIANT_POOL: BackgroundVariant[] = [
  { className: 'bg-radial-glow', label: 'Radial glow bloom' },
  { className: 'bg-diagonal-lines', label: 'Fine diagonal lines' },
  { className: 'bg-wave', label: 'Bottom wave accent' },
  { className: 'bg-subtle-grid', label: 'Dot grid pattern' },
  { className: 'bg-circuit', label: 'Circuit trace pattern' },
  { className: 'bg-corner-accent', label: 'Corner accent glow' },
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
};

// ── Light-Background Variant Pool (McKinsey / Consulting) ───

const LIGHT_VARIANT_POOL: BackgroundVariant[] = [
  { className: 'bg-clean', label: 'Clean white' },
  { className: 'bg-section-divider', label: 'Navy section divider' },
  { className: 'bg-callout', label: 'Light blue callout' },
];

const LIGHT_TYPE_TO_VARIANT: Record<SlideType, number> = {
  TITLE: 1,          // bg-section-divider (navy)
  CTA: 1,            // bg-section-divider (navy)
  QUOTE: 2,          // bg-callout (ice blue)
  PROBLEM: 0,        // bg-clean (white)
  SOLUTION: 0,
  ARCHITECTURE: 0,
  PROCESS: 0,
  DATA_METRICS: 0,
  COMPARISON: 0,
  CONTENT: 0,
  VISUAL_HUMOR: 0,  // bg-clean (image dominates)
};

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

function circuitSvg(bg: string): string {
  const pc = isDarkBg(bg) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  return encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>`
    + `<line x1='20' y1='20' x2='80' y2='20' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='80' y1='20' x2='80' y2='80' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='80' cy='80' r='3' fill='${pc}'/>`
    + `<line x1='120' y1='60' x2='180' y2='60' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='120' y1='60' x2='120' y2='140' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='120' cy='140' r='3' fill='${pc}'/>`
    + `<line x1='40' y1='120' x2='40' y2='180' stroke='${pc}' stroke-width='1.5'/>`
    + `<line x1='40' y1='180' x2='160' y2='180' stroke='${pc}' stroke-width='1.5'/>`
    + `<circle cx='160' cy='180' r='3' fill='${pc}'/>`
    + `</svg>`,
  );
}

/**
 * Generate Marp CSS for all 6 background variant classes.
 * Each class provides its own background, replacing the global gradient.
 */
export function generateMarpBackgroundCSS(
  palette: ColorPalette,
  bg: string,
  gradientEnd: string,
): string {
  const baseGrad = `linear-gradient(135deg, ${bg} 0%, ${gradientEnd} 100%)`;
  const pc = patternColor(bg, 0.03);
  const accentRgba = hexToRgba(palette.primary, 0.08);
  const accentCorner = hexToRgba(palette.accent, 0.06);

  const lines: string[] = [];

  // 0. bg-radial-glow — soft radial bloom
  lines.push(`  section.bg-radial-glow {`);
  lines.push(`    background: radial-gradient(ellipse at 30% 50%, ${accentRgba} 0%, transparent 70%), ${baseGrad};`);
  lines.push(`  }`);

  // 1. bg-diagonal-lines — fine hairlines
  lines.push(`  section.bg-diagonal-lines {`);
  lines.push(`    background: repeating-linear-gradient(45deg, transparent, transparent 14px, ${pc} 14px, ${pc} 15px), ${baseGrad};`);
  lines.push(`  }`);

  // 2. bg-wave — SVG wave at bottom
  lines.push(`  section.bg-wave {`);
  lines.push(`    background: url("data:image/svg+xml,${waveSvg(palette.accent)}") no-repeat bottom center / 100% 80px, ${baseGrad};`);
  lines.push(`  }`);

  // 3. bg-subtle-grid — dot grid
  lines.push(`  section.bg-subtle-grid {`);
  lines.push(`    background: radial-gradient(circle, ${pc} 1px, transparent 1px), ${baseGrad};`);
  lines.push(`    background-size: 30px 30px, 100% 100%;`);
  lines.push(`  }`);

  // 4. bg-circuit — trace pattern
  lines.push(`  section.bg-circuit {`);
  lines.push(`    background: url("data:image/svg+xml,${circuitSvg(bg)}") repeat, ${baseGrad};`);
  lines.push(`    background-size: 200px 200px, 100% 100%;`);
  lines.push(`  }`);

  // 5. bg-corner-accent — glow in top-right
  lines.push(`  section.bg-corner-accent {`);
  lines.push(`    background: linear-gradient(225deg, ${accentCorner} 0%, transparent 40%), ${baseGrad};`);
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
    `    border-top: 4px solid ${safeAccent};`,
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
    `  }`,
    `  section.lead strong {`,
    `    color: ${safeAccent};`,
    `  }`,
    `  section.lead::after {`,
    `    content: '';`,
    `    position: absolute;`,
    `    bottom: 0; left: 0; right: 0;`,
    `    height: 100px;`,
    `    background: linear-gradient(to top, rgba(0,0,0,0.12), transparent);`,
    `    pointer-events: none;`,
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
    `    border-top: 3px solid ${blue};`,
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
  ].join('\n');
}

/**
 * Generate Marp CSS for McKinsey-style tables.
 * Navy header, horizontal-only borders, alternating rows.
 */
export function generateMarpMcKinseyTableCSS(palette: ColorPalette): string {
  return [
    `  table { border-collapse: collapse; width: 100%; font-size: 0.75em; margin-top: 0.3em; margin-bottom: 0.3em; }`,
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
  const pc = patternColor(bg, 0.03);
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

