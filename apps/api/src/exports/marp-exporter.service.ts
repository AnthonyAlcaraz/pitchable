import { Injectable, Logger } from '@nestjs/common';
import { marpCli } from '@marp-team/marp-cli';
import { writeFile, mkdir, readFile, readdir, unlink } from 'fs/promises';
import { dirname, resolve, join } from 'path';

import PptxGenJS from 'pptxgenjs';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';
import {
  hexToRgb,
  luminance,
  contrastRatio,
} from '../constraints/index.js';
import {
  getSlideBackground,
  getHeroBackground,
  generateMarpBackgroundCSS,
  generateBackgroundShades,
  generateMarpAccentRotationCSS,
  generateLeadEnhancementCSS,
  generateMarpMcKinseyCSS,
  generateMarpMcKinseyTableCSS,
  generateMarpMcKinseyLeadCSS,
  generateMarpDarkTierCSS,
} from './slide-visual-theme.js';
import {
  FIGMA_GRADE_TYPES,
  buildHtmlSlideContent,
  detectContentMood,
  moodTextColors,
  type ContentMood,
  type MoodTextColors,
} from './html-slide-templates.js';


// Ã¢ÂÂÃ¢ÂÂ Layout profiles Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export type LayoutProfile = 'corporate' | 'startup' | 'creative' | 'consulting' | 'technical';

interface LayoutProfileConfig {
  /** Show glass-card wrappers on content slides */
  glassCards: boolean;
  /** Enable bokeh/radial-glow background variants */
  bokeh: boolean;
  /** Font size multiplier (1.0 = default 28px body) */
  fontScale: number;
  /** Force serif heading fonts (consulting style) */
  serifHeadings: boolean;
  /** Opacity multiplier for background decorations (0 = off, 1 = full) */
  bgDecorationOpacity: number;
  /** Enable section pill badges */
  sectionPills: boolean;
}

const LAYOUT_PROFILE_CONFIGS: Record<LayoutProfile, LayoutProfileConfig> = {
  corporate: {
    glassCards: false,
    bokeh: false,
    fontScale: 1.0,
    serifHeadings: false,
    bgDecorationOpacity: 0.3,
    sectionPills: true,
  },
  startup: {
    glassCards: true,
    bokeh: true,
    fontScale: 1.0,
    serifHeadings: false,
    bgDecorationOpacity: 1.0,
    sectionPills: true,
  },
  creative: {
    glassCards: true,
    bokeh: true,
    fontScale: 1.05,
    serifHeadings: false,
    bgDecorationOpacity: 1.2,
    sectionPills: true,
  },
  consulting: {
    glassCards: false,
    bokeh: false,
    fontScale: 0.95,
    serifHeadings: true,
    bgDecorationOpacity: 0,
    sectionPills: false,
  },
  technical: {
    glassCards: true,
    bokeh: false,
    fontScale: 0.95,
    serifHeadings: false,
    bgDecorationOpacity: 0.5,
    sectionPills: true,
  },
};

/** Quote paths with double-quotes for shell safety (handles spaces, ampersands, etc.). */
function shellSafePath(p: string): string {
  return `"${p.replace(/\\/g, '/')}"`;
}

// Ã¢ÂÂÃ¢ÂÂ Color contrast helpers Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

/** Convert RGB components (0-255) back to hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by a fraction (0-1). */
function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

/** Darken a hex color by a fraction (0-1). */
function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** True if the background is dark (luminance < 0.18). */
function isDarkBackground(bg: string): boolean {
  return luminance(bg) < 0.18;
}

/**
 * Adjust foreground color until it meets minRatio contrast against background.
 * Lightens on dark backgrounds, darkens on light backgrounds.
 * Returns the adjusted color (or the original if already passing).
 */
function ensureContrast(fg: string, bg: string, minRatio: number): string {
  let ratio = contrastRatio(fg, bg);
  if (ratio >= minRatio) return fg;

  const lighten = isDarkBackground(bg);
  let adjusted = fg;
  // Progressively adjust in 5% steps up to 20 iterations
  for (let step = 0.05; step <= 1.0 && ratio < minRatio; step += 0.05) {
    adjusted = lighten ? lightenColor(fg, step) : darkenColor(fg, step);
    ratio = contrastRatio(adjusted, bg);
  }
  return adjusted;
}

/** Convert hex to hex+alpha suffix (e.g. #0f172a + 0.9 Ã¢ÂÂ #0f172ae6). */
function hexWithAlpha(hex: string, alpha: number): string {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
}

// Ã¢ÂÂÃ¢ÂÂ Palette interface Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

interface ColorPalette {
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

function parseJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let offset = 2; // skip SOI
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    // SOF0 (0xC0) or SOF2 (0xC2) — baseline or progressive
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const segLen = buf.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  return null;
}

@Injectable()
export class MarpExporterService {
  private readonly logger = new Logger(MarpExporterService.name);

  generateMarpMarkdown(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
    layoutProfile: LayoutProfile = 'startup',
    rendererOverrides?: Map<number, string>,
    figmaBackgrounds?: Map<number, string>,
    figmaContrastOverrides?: Map<number, { isDark: boolean; textColor: string }>,
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;

    const profile = LAYOUT_PROFILE_CONFIGS[layoutProfile];
    // McKinsey theme always forces consulting profile behavior
    const isMcKinsey = theme.name === 'mckinsey-executive';
    const isConsulting = isMcKinsey || layoutProfile === 'consulting';

    // Ã¢ÂÂÃ¢ÂÂ Contrast-safe color computation Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    const bg = palette.background;
    const safeText = ensureContrast(palette.text, bg, 7.0);
    const safePrimary = ensureContrast(palette.primary, bg, 4.5);
    const safeAccent = ensureContrast(palette.accent, bg, 4.5);
    const safeSecondary = ensureContrast(palette.secondary, bg, 4.5);
    const safeSuccess = ensureContrast(palette.success, bg, 4.5);
    const safeError = ensureContrast(palette.error, bg, 4.5);

    // Contrast audit: log all color pairs for debugging
    const contrastPairs: Array<[string, string, string, number]> = [
      ['text', safeText, bg, contrastRatio(safeText, bg)],
      ['primary', safePrimary, bg, contrastRatio(safePrimary, bg)],
      ['accent', safeAccent, bg, contrastRatio(safeAccent, bg)],
      ['secondary', safeSecondary, bg, contrastRatio(safeSecondary, bg)],
    ];
    const failures = contrastPairs.filter(([, , , ratio]) => ratio < 4.5);
    if (failures.length > 0) {
      this.logger.warn(
        `[CONTRAST] Theme "${theme.name}" has ${failures.length} low-contrast pairs: ` +
        failures.map(([name, fg, b, ratio]) => `${name}(${fg} on ${b})=${ratio.toFixed(1)}`).join(', '),
      );
    } else {
      this.logger.debug(`[CONTRAST] Theme "${theme.name}" Ã¢ÂÂ all ${contrastPairs.length} color pairs pass WCAG AA+`);
    }

    // Table header background: surface-like, darkened from background
    const tableHeaderBg = isDarkBackground(bg)
      ? lightenColor(bg, 0.12)
      : darkenColor(bg, 0.06);
    const safeThText = ensureContrast(safePrimary, tableHeaderBg, 4.5);

    // Table cell text must be readable against surface
    const safeTdText = ensureContrast(palette.text, palette.surface, 7.0);

    // Gradient end: derived from background, not hardcoded
    const gradientEnd = isDarkBackground(bg)
      ? darkenColor(bg, 0.15)
      : lightenColor(bg, 0.05);

    // Blockquote and table backgrounds with transparency (hex+alpha)
    const blockquoteBg = hexWithAlpha(palette.surface, 0.5);
    const tableBg = hexWithAlpha(bg, 0.9);

    // Consulting profile + McKinsey use serif heading; all others sans-serif
    const useSerif = isConsulting || profile.serifHeadings;
    const headingFontStack = useSerif
      ? `'${theme.headingFont}', serif`
      : `'${theme.headingFont}', sans-serif`;
    const bodyFontStack = `'${theme.bodyFont}', sans-serif`;
    const baseFontSize = Math.round(28 * profile.fontScale);

    // Marp frontmatter with contrast-validated, theme-aware CSS
    const frontmatter = [
      '---',
      'marp: true',
      'theme: default',
      'paginate: true',
      `backgroundColor: ${bg}`,
      `color: ${safeText}`,
      'style: |',
      '  section {',
      `    --accent: ${safeAccent};`,
      `    --primary: ${safePrimary};`,
      `    --surface: ${palette.surface};`,
      `    color: ${safeText};`,
      `    font-family: ${bodyFontStack};`,
      `    font-size: ${baseFontSize}px;`,
      '    overflow: hidden;',
      '    padding: 32px 40px 40px 40px;',
      '    display: flex;',
      '    flex-direction: column;',
      '    justify-content: center;',
      '  }',
      '  section > * {',
      '    flex-shrink: 1;',
      '  }',
      '  section table {',
      '    font-size: 0.88em;',
      '  }',
      '  section h1 + table, section h1 + p + table, section p + table {',
      '    margin-top: 0.3em;',
      '  }',
      '  h1 {',
      `    color: ${safePrimary};`,
      `    font-family: ${headingFontStack};`,
      `    font-size: 1.6em;`,
      '    margin-top: 0;',
      '    margin-bottom: 0.2em;',
      '  }',
      '  h1::after {',
      '    content: "";',
      '    display: block;',
      '    width: 60px;',
      '    height: 3px;',
      `    background: ${safeAccent};`,
      '    border-radius: 2px;',
      '    margin-top: 6px;',
      '  }',
      '  h2 {',
      `    color: ${safeText};`,
      `    font-family: ${headingFontStack};`,
      '    font-size: 1.15em;',
      '    margin-top: 0.15em;',
      '    margin-bottom: 0.2em;',
      '  }',
      '  h3 {',
      `    color: ${safeAccent};`,
      `    font-family: ${headingFontStack};`,
      '    font-size: 1.1em;',
      '    margin-top: 0.2em;',
      '    margin-bottom: 0.15em;',
      '  }',
      '  p, li {',
      '    font-size: 1.0em;',
      '    line-height: 1.45;',
      '    margin-top: 0.15em;',
      '    margin-bottom: 0.15em;',
      `    color: ${safeText};`,
      '  }',
      '  strong {',
      `    color: ${isConsulting ? safePrimary : safeAccent};`,
      '  }',
      // Ensure bold text inside table cells contrasts against cell backgrounds
      `  td strong { color: ${ensureContrast(isConsulting ? palette.primary : palette.accent, palette.surface, 4.5)}; }`,
      `  tr:nth-child(even) td strong { color: ${ensureContrast(isConsulting ? palette.primary : palette.accent, bg, 4.5)}; }`,
      `  th strong { color: ${ensureContrast('#FFFFFF', tableHeaderBg, 4.5)}; }`,
      '  em {',
      `    color: ${safeSecondary};`,
      '  }',
      '  a {',
      `    color: ${safeAccent};`,
      '    text-decoration: none;',
      '  }',
    ];

    // Table + blockquote CSS: consulting profile gets clean horizontal-only borders
    if (isConsulting) {
      frontmatter.push(generateMarpMcKinseyTableCSS(palette));
    } else {
      frontmatter.push(
        '  blockquote {',
        `    border-left: 4px solid ${safeAccent};`,
        '    padding: 0.5em 1em;',
        '    font-size: 0.85em;',
        `    color: ${safeText};`,
        `    background: ${blockquoteBg};`,
        '  }',
        '  table {',
        '    width: auto;',
        '    min-width: 70%;',
        '    max-width: 100%;',
        '    margin-left: auto;',
        '    margin-right: auto;',
        '    border-collapse: collapse;',
        '    font-size: 0.88em;',
        '    margin-top: 0.3em;',
        '    margin-bottom: 0.3em;',
        `    background: ${tableBg};`,
        '  }',
        '  th {',
        `    background: ${tableHeaderBg};`,
        `    color: ${safeThText};`,
        '    padding: 5px 10px;',
        `    border: 1px solid ${palette.border};`,
        '    font-weight: bold;',
        '  }',
        '  td {',
        `    background: ${palette.surface};`,
        `    color: ${safeTdText};`,
        '    padding: 5px 10px;',
        `    border: 1px solid ${palette.border};`,
        '  }',
        '  tr:nth-child(even) td {',
        `    background: ${bg};`,
        `    color: ${safeText};`,
        '  }',
      );
    }

    // Ensure code text is readable against its own background (surface color)
    const safeCodeText = ensureContrast(palette.text, palette.surface, 7.0);

    frontmatter.push(
      '  code {',
      `    background-color: ${palette.surface};`,
      `    color: ${safeCodeText};`,
      '    padding: 0.2em 0.4em;',
      `    border-radius: ${isConsulting ? '2px' : '4px'};`,
      '    font-size: 0.85em;',
      '  }',
      '  pre {',
      `    background-color: ${palette.surface};`,
      `    color: ${safeCodeText};`,
      '    padding: 0.8em;',
      `    border-radius: ${isConsulting ? '2px' : '6px'};`,
      '  }',
      '  .source {',
      `    font-size: ${isConsulting ? '0.45em' : '0.55em'};`,
      `    color: ${safeSecondary};`,
      '  }',
      `  .gold { color: ${safeAccent}; }`,
      `  .green { color: ${safeSuccess}; }`,
      `  .red { color: ${safeError}; }`,
      // Global catch-all: prevent browser default black text on any element
      '  * {',
      `    color: inherit;`,
      '  }',
    );

    // Background variants + accent rotation + lead styling (profile-conditional)
    if (isConsulting) {
      frontmatter.push(generateMarpMcKinseyCSS(palette));
      // No accent rotation Ã¢ÂÂ consulting uses uniform primary bold
      frontmatter.push(generateMarpMcKinseyLeadCSS(palette));
    } else if (!profile.bokeh) {
      // Corporate/technical: backgrounds but no bokeh radial glows
      const bgShades = isDarkBackground(bg) ? generateBackgroundShades(bg, safeText) : undefined;
      frontmatter.push(generateMarpBackgroundCSS(palette, bg, gradientEnd, bgShades));
      frontmatter.push(generateMarpAccentRotationCSS(safeAccent, safePrimary, safeSuccess, safeSecondary));
      frontmatter.push(generateLeadEnhancementCSS(safeAccent, safeText));
      if (isDarkBackground(bg)) {
        frontmatter.push(generateMarpDarkTierCSS(palette));
      }
      // Tone down radial-glow by overriding its opacity (::before only — ::after is reserved for Marp pagination)
      if (profile.bgDecorationOpacity < 1.0) {
        frontmatter.push(
          `  section.bg-radial-glow::before { opacity: ${(0.15 * profile.bgDecorationOpacity).toFixed(2)} !important; }`,
        );
      }
    } else {
      // Startup/creative: full background effects
      const bgShades = isDarkBackground(bg) ? generateBackgroundShades(bg, safeText) : undefined;
      frontmatter.push(generateMarpBackgroundCSS(palette, bg, gradientEnd, bgShades));
      frontmatter.push(generateMarpAccentRotationCSS(safeAccent, safePrimary, safeSuccess, safeSecondary));
      frontmatter.push(generateLeadEnhancementCSS(safeAccent, safeText));
      if (isDarkBackground(bg)) {
        frontmatter.push(generateMarpDarkTierCSS(palette));
      }
    }

    const isDark = isDarkBackground(bg);
    frontmatter.push(
      '  section::after {',
      '    position: absolute !important;',
      '    right: 32px;',
      '    bottom: 18px;',
      '    left: auto !important;',
      `    color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)'};`,
      '    font-size: 12px;',
      `    background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};`,
      '    padding: 2px 8px;',
      '    border-radius: 4px;',
      '    z-index: 50;',
      '  }',
      '  ul, ol { margin-top: 0.2em; margin-bottom: 0.2em; padding-left: 1.2em; }',
      '  ul { list-style-type: disc; }',
      '  ul ul { list-style-type: circle; }',
      '  li { margin-bottom: 0.15em; line-height: 1.3; }',
      '  li::marker { color: var(--accent); }',
      '  section.content-spread ul, section.content-center ul { list-style: none; padding-left: 0; }',
      '  section.content-spread li, section.content-center li { margin-bottom: 0.3em; line-height: 1.5; }',
      '  section.content-spread li::before, section.content-center li::before { content: "40"; color: var(--accent); font-weight: bold; }',
      // Layout classes for content centering/spreading
      '  section.content-center { justify-content: center; text-align: center; align-items: center; }',
      '  section.content-spread { justify-content: space-between; text-align: center; align-items: center; }',
      // Glass card effect (controlled by layout profile)
      '  .glass-card {',
      ...(profile.glassCards ? [
        '    background: rgba(255, 255, 255, 0.06);',
        '    backdrop-filter: blur(12px);',
        '    -webkit-backdrop-filter: blur(12px);',
        '    border: 1px solid rgba(255, 255, 255, 0.12);',
        '    border-radius: 16px;',
        '    padding: 20px 24px;',
      ] : [
        '    padding: 12px 0;',
      ]),
      '    margin: 8px -8px 0 -8px;',
      '    flex-grow: 1;',
      '    display: flex;',
      '    flex-direction: column;',
      '    justify-content: center;',
      '  }',
      // Overflow safety: stats grids auto-fit to prevent bottom clipping
      '  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; text-align: center; }',
      '  .stat-card .big-number { font-size: 2.4em; line-height: 1; }',
      '  .stat-card p { font-size: 0.6em; opacity: 0.8; margin-top: 2px; }',
      // AMI Labs: section label pill badge
      '  .section-pill {',
      '    display: inline-block;',
      `    background: ${safeAccent};`,
      '    color: #FFFFFF;',
      '    padding: 4px 16px;',
      '    border-radius: 20px;',
      '    font-size: 0.55em;',
      '    font-weight: 700;',
      '    letter-spacing: 0.08em;',
      '    text-transform: uppercase;',
      '    margin-bottom: 8px;',
      '  }',
      // AMI Labs: large number anchor for data slides
      '  .big-number {',
      '    font-size: 3.5em;',
      '    font-weight: 800;',
      `    color: ${safeAccent};`,
      '    line-height: 1.0;',
      '    margin-bottom: 4px;',
      `    text-shadow: 0 0 40px ${hexWithAlpha(safeAccent, 0.25)};`,
      '  }',
      '  img { max-height: 280px; margin: 4px auto; }',
      '---',
    );

    const slideSections: string[] = [];

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    const totalSlides = sortedSlides.length;
    for (const slide of sortedSlides) {
      const rendererOverride = rendererOverrides?.get(slide.slideNumber);
      const figmaBg = figmaBackgrounds?.get(slide.slideNumber);
      slideSections.push(this.buildSlideMarkdown(slide, bg, safePrimary, profile, palette, rendererOverride, figmaBg, figmaContrastOverrides?.get(slide.slideNumber), totalSlides));
    }

    return frontmatter.join('\n') + '\n\n' + slideSections.join('\n\n---\n\n');
  }

  private buildSlideMarkdown(slide: SlideModel, bgColor?: string, primaryColor?: string, profile?: LayoutProfileConfig, palette?: ColorPalette, rendererOverride?: string, figmaBackground?: string, figmaContrast?: { isDark: boolean; textColor: string }, totalSlides?: number): string {
    const lines: string[] = [];
    const type = slide.slideType;
    const bgVariant = getSlideBackground(type, slide.slideNumber, bgColor);

    // ── Figma-grade dispatch (BEFORE bg-class) ──────────────────
    // Figma HTML templates fully control background, text colors, and layout
    // via inline styles. Dispatching them BEFORE bg-class assignment prevents
    // CSS !important rules from bg-class patterns interfering with inline colors.
    const figmaType = (rendererOverride && FIGMA_GRADE_TYPES.has(rendererOverride))
      ? rendererOverride
      : (FIGMA_GRADE_TYPES.has(type) ? type : null);

    if (figmaType && palette) {
      lines.push(`<!-- _backgroundColor: ${palette.background} -->`);
      lines.push(`<!-- _color: ${palette.text} -->`);
      lines.push('<!-- _paginate: false -->');
      lines.push('');
      // Mood-based font coloring for Figma-grade slides (belt-and-suspenders with inline styles)
      const fMood = detectContentMood(slide.title || '', slide.body || '');
      if (fMood !== 'NEUTRAL') {
        const fDark = isDarkBackground(palette.background);
        const fmc = moodTextColors(fMood, palette, fDark);
        const fCss: string[] = [];
        if (fmc.titleColor !== palette.text) {
          fCss.push(`h1 { color: ${fmc.titleColor} !important; }`);
          fCss.push(`div[style*="font-weight:bold"] { color: ${fmc.titleColor} !important; }`);
        }
        if (fmc.emphasisColor !== palette.accent) {
          fCss.push(`strong { color: ${fmc.emphasisColor} !important; }`);
          fCss.push(`div[style*="font-weight:600"] { color: ${fmc.emphasisColor} !important; }`);
        }
        if (fmc.metricColor !== palette.primary) {
          fCss.push(`.big-number { color: ${fmc.metricColor} !important; }`);
        }
        if (fCss.length > 0) {
          lines.push(`<style scoped>${fCss.join(' ')}</style>`);
          lines.push('');
        }
      }
      let figmaHtml = buildHtmlSlideContent(
        { title: slide.title, body: slide.body || '', slideType: figmaType, imageUrl: slide.imageUrl ?? undefined },
        palette,
      );
      // Inject page number into Figma-grade HTML (Marp pagination is hidden behind full-bleed HTML)
      if (totalSlides) {
        const isDark = palette.background ? isDarkBackground(palette.background) : true;
        const pnColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
        const pageNum = `<div style="position:absolute;right:32px;bottom:18px;font-size:11px;color:${pnColor};font-family:system-ui,sans-serif;pointer-events:none">${slide.slideNumber} / ${totalSlides}</div>`;
        // Insert before closing </div> of the wrapper
        const lastClose = figmaHtml.lastIndexOf('</div>');
        if (lastClose > -1) {
          figmaHtml = figmaHtml.slice(0, lastClose) + pageNum + figmaHtml.slice(lastClose);
        }
      }
      lines.push(figmaHtml);
      lines.push('');
      if (slide.speakerNotes) {
        lines.push('<!--');
        lines.push(slide.speakerNotes);
        lines.push('-->');
      }
      return lines.join('\n');
    }

    // ── Non-Figma slides: bg-class system ───────────────────────
    // Layout class by type
    const centerTypes = ['QUOTE', 'COMPARISON', 'MARKET_SIZING', 'LOGO_WALL'];
    const spreadTypes = ['DATA_METRICS', 'METRICS_HIGHLIGHT', 'ARCHITECTURE', 'PROCESS', 'FEATURE_GRID', 'TIMELINE', 'PRODUCT_SHOWCASE', 'SPLIT_STATEMENT'];
    const layoutClass = centerTypes.includes(type) ? ' content-center'
      : spreadTypes.includes(type) ? ' content-spread'
      : '';

    // Per-slide background + type-specific Marp directives
    if (type === 'SECTION_DIVIDER') {
      // Full-bleed accent background, centered text
      lines.push('<!-- _class: lead -->');
      lines.push(`<!-- _backgroundColor: ${primaryColor || '#1e3a5f'} -->`);
      lines.push('<!-- _color: #FFFFFF -->');
      lines.push('');
    } else if (type === 'VISUAL_HUMOR') {
      // Image-forward humor slide: full-screen image, centered text overlay
      lines.push('<!-- _class: lead -->');
      lines.push('');
    } else if (type === 'TITLE' || type === 'CTA') {
      lines.push(`<!-- _class: lead ${bgVariant.className} -->`);
      // Override Marp's global backgroundColor for divider slides
      if (bgVariant.className === 'bg-section-divider') {
        lines.push('<!-- _backgroundColor: #051C2C -->');
        lines.push('<!-- _color: #FFFFFF -->');
      } else if (bgVariant.className === 'bg-hero' && palette) {
        const heroBg = getHeroBackground(palette);
        lines.push(`<!-- _backgroundColor: ${heroBg} -->`);
        lines.push('<!-- _color: #FFFFFF -->');
      } else {
        // Defensive fallback: TITLE/CTA must always have explicit contrast
        // Without this, edge-case bg variants can produce invisible text
        const fallbackBg = palette ? getHeroBackground(palette) : '#1E293B';
        lines.push(`<!-- _backgroundColor: ${fallbackBg} -->`);
        lines.push('<!-- _color: #FFFFFF -->');
      }
      lines.push('');
    } else if (type === 'METRICS_HIGHLIGHT') {
      // FIGMA_GRADE templates use inline HTML with palette-driven colors.
      // Use palette.surface for background so dark themes render correctly.
      if (bgVariant.className === 'bg-callout-dark' && palette) {
        lines.push(`<!-- _class: bg-callout -->`);
        lines.push(`<!-- _backgroundColor: ${palette.surface} -->`);
        lines.push(`<!-- _color: ${palette.text} -->`);
      } else {
        lines.push(`<!-- _class: ${bgVariant.className} -->`);
      }
      lines.push('');
    } else {
      // Append no-image class for all image-free slides to boost background pattern visibility
      const noImageSuffix = !slide.imageUrl ? ' no-image' : '';
      lines.push(`<!-- _class: ${bgVariant.className}${layoutClass}${noImageSuffix} -->`);
      if (bgVariant.className === 'bg-callout-dark' && palette) {
        lines.push(`<!-- _backgroundColor: ${palette.surface} -->`);
        lines.push(`<!-- _color: ${palette.text} -->`);
      } else if (bgVariant.className === 'bg-section-divider') {
        // Navy divider: always white text
        lines.push('<!-- _backgroundColor: #051C2C -->');
        lines.push('<!-- _color: #FFFFFF -->');
      } else if (bgVariant.className === 'bg-accent-tint' && palette) {
        // Tinted background: ensure text contrasts with the tinted surface
        lines.push(`<!-- _color: ${palette.text} -->`);
      } else if (palette) {
        // Fallback: always set explicit text color from palette for contrast safety
        lines.push(`<!-- _backgroundColor: ${palette.background} -->`);
        lines.push(`<!-- _color: ${palette.text} -->`);
      }
      lines.push('');
    }

    // Figma template background: full-bleed behind all content
    if (figmaBackground) {
      lines.push(`![bg](${figmaBackground})`);
      // Per-slide contrast override: ensure text is readable on Figma background
      if (figmaContrast) {
        lines.push(`<!-- _color: ${figmaContrast.textColor} -->`);
        lines.push('<!-- _backgroundColor: transparent -->');
      }
      lines.push('');
    }

    // Section label (AMI Labs style - colored pill badge; disabled in consulting profile)
    const showPills = profile?.sectionPills !== false;
    const sectionLabel = (slide as Record<string, unknown>).sectionLabel as string | undefined;
    if (showPills && sectionLabel && type !== 'TITLE' && type !== 'CTA' && type !== 'SECTION_DIVIDER') {
      lines.push(`<span class="section-pill">${sectionLabel.toUpperCase()}</span>`);
      lines.push('');
    }

    // Title
    if (slide.title) {
      lines.push(`# ${slide.title.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1')}`);
      lines.push('');
    }

    // SECTION_DIVIDER: title only, no body/image/notes (Marp paginate handles page numbers)
    if (type === 'SECTION_DIVIDER') {
      return lines.join('\n');
    }

    // Image placement Ã¢ÂÂ varies by slide type and per-slide imageLayout
    if (slide.imageUrl) {
      const slideLayout = (slide as Record<string, unknown>).imageLayout as string | null;
      if (type === 'VISUAL_HUMOR') {
        // Full-screen background at high visibility Ã¢ÂÂ image IS the slide
        lines.push(`![bg brightness:0.7](${slide.imageUrl})`);
      } else if (type === 'TITLE' || type === 'CTA') {
        // Background for hero slides — 25% opacity balances visibility with text readability
        lines.push(`![bg opacity:0.25](${slide.imageUrl})`);
      } else if (type === 'QUOTE' && slideLayout !== 'BACKGROUND') {
        // Blurred background for cinematic testimonial feel
        lines.push(`![bg blur:12px brightness:0.3](${slide.imageUrl})`);
      } else if (type === 'SOLUTION' && slideLayout !== 'BACKGROUND') {
        // Left-side image to mirror PROBLEM's right-side
        lines.push(`![bg left:40%](${slide.imageUrl})`);
      } else if (type === 'ARCHITECTURE' && slideLayout !== 'BACKGROUND') {
        // Contain (not cover) to preserve diagram integrity
        lines.push(`![bg right:40% contain](${slide.imageUrl})`);
      } else if (type === 'PRODUCT_SHOWCASE') {
        // Right-side product mockup Ã¢ÂÂ larger (45%) and contained to show full screenshot
        lines.push(`![bg right:45% contain](${slide.imageUrl})`);
      } else if (slideLayout === 'BACKGROUND') {
        // Per-slide background layout
        lines.push(`![bg opacity:0.15](${slide.imageUrl})`);
      } else {
        // Default: right-side image (35% width)
        lines.push(`![bg right:35%](${slide.imageUrl})`);
      }
      lines.push('');
    }

    // Inject scoped CSS for grid-based slide types (keeps LLM body simple)
    const scopedCSS: Record<string, string> = {
      QUOTE: `<style scoped>
blockquote { position: relative; border-left: 5px solid var(--accent, #38bdf8); padding: 20px 28px 20px 36px; font-size: 1.15em; font-style: italic; line-height: 1.6; margin: 12px 0; }
blockquote::before { content: "\\201C"; font-size: 5em; position: absolute; left: 8px; top: -12px; color: var(--accent, #38bdf8); opacity: 0.25; font-family: Georgia, serif; line-height: 1; }
blockquote p { font-size: 1em; margin: 4px 0; }
blockquote + p { font-size: 0.7em; letter-spacing: 0.04em; margin-top: 16px; opacity: 0.75; }
</style>`,
      TEAM: `<style scoped>
.team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 12px; }
.team-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center; }
.team-card strong { display: block; font-size: 1.1em; margin-bottom: 4px; }
.team-card em { font-size: 0.8em; }
.team-card span { font-size: 0.7em; opacity: 0.7; display: block; margin-top: 4px; }
</style>`,
      TIMELINE: `<style scoped>
ol { display: flex; list-style: none; padding: 0; margin: 24px 0 0; position: relative; gap: 0; }
ol::before { content: ''; position: absolute; top: 22px; left: 8%; right: 8%; height: 3px; background: var(--accent, #38bdf8); opacity: 0.4; }
ol li { flex: 1; text-align: center; position: relative; padding-top: 50px; font-size: 0.72em; line-height: 1.3; }
ol li::before { content: ''; position: absolute; top: 13px; left: 50%; transform: translateX(-50%); width: 18px; height: 18px; background: var(--accent, #38bdf8); border-radius: 50%; z-index: 1; }
ol li strong { display: block; font-size: 1.05em; margin-bottom: 2px; }
h3 { margin-top: 16px; font-size: 0.8em; }
</style>`,
      METRICS_HIGHLIGHT: `<style scoped>
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 12px; text-align: center; }
.stat-card { padding: 12px; }
.stat-card .big-number { font-size: 2.8em; line-height: 1; }
.stat-card p { font-size: 0.6em; opacity: 0.8; margin-top: 4px; }
h3 { margin-top: 12px; font-size: 0.8em; }
</style>`,
      DATA_METRICS: `<style scoped>
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 12px; text-align: center; }
.stat-card { padding: 12px; }
.stat-card .big-number { font-size: 2.8em; line-height: 1; }
.stat-card p { font-size: 0.6em; opacity: 0.8; margin-top: 4px; }
h3 { margin-top: 10px; font-size: 0.8em; }
.source { font-size: 0.5em; }
</style>`,
      FEATURE_GRID: `<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
.card { background: rgba(255,255,255,0.06); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; }
.card strong { font-size: 0.95em; display: block; margin-bottom: 6px; }
.card span { font-size: 0.7em; line-height: 1.3; opacity: 0.85; }
</style>`,
      PRODUCT_SHOWCASE: `<style scoped>
.showcase { max-width: 55%; }
.showcase strong { font-size: 1.3em; display: block; margin-bottom: 8px; line-height: 1.2; }
.showcase span { font-size: 0.8em; line-height: 1.4; opacity: 0.85; display: block; }
</style>`,
      LOGO_WALL: `<style scoped>
.logo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
.logo-badge { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 14px 16px; text-align: center; font-size: 0.75em; font-weight: 600; letter-spacing: 0.02em; }
</style>`,
      MARKET_SIZING: `<style scoped>
.market-sizing { display: flex; align-items: center; justify-content: center; margin-top: 12px; position: relative; min-height: 360px; }
.market-ring { border: 2px solid var(--accent, #38bdf8); border-radius: 50%; display: flex; position: absolute; }
.market-ring.tam { width: 340px; height: 340px; opacity: 0.4; align-items: flex-start; justify-content: center; padding-top: 16px; }
.market-ring.sam { width: 230px; height: 230px; opacity: 0.6; align-items: flex-end; justify-content: center; padding-bottom: 12px; }
.market-ring.som { width: 130px; height: 130px; opacity: 1.0; background: rgba(56,189,248,0.10); align-items: center; justify-content: center; }
.ring-label { text-align: center; font-size: 0.55em; line-height: 1.2; }
.ring-label strong { font-size: 1.5em; display: block; margin-bottom: 1px; color: var(--accent, #38bdf8); }
.ring-label span { opacity: 0.7; font-size: 0.9em; }
.revenue-chain { margin-top: 16px; font-size: 0.7em; text-align: center; opacity: 0.8; }
</style>`,
      SPLIT_STATEMENT: `<style scoped>
.split-statement { display: grid; grid-template-columns: 30% 1fr; gap: 24px; align-items: start; max-height: 100%; overflow: hidden; }
.statement { font-size: 1.3em; font-weight: 800; line-height: 1.15; }
.evidence { font-size: 0.75em; overflow: hidden; }
.evidence strong { display: block; font-size: 1.1em; margin-bottom: 3px; margin-top: 10px; }
.evidence hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 6px 0; }
p, li { font-size: 0.85em; line-height: 1.4; text-align: center; }
strong { font-size: 1.05em; }
section { text-align: center !important; align-items: center !important; overflow: hidden !important; }
ul { list-style: none !important; padding-left: 0 !important; margin: 0 auto; max-width: 90%; }
li { margin-bottom: 0.3em; }
</style>`,
    };
    if (scopedCSS[type]) {
      lines.push(scopedCSS[type]);
      lines.push('');
    }

    // ── Per-slide mood-based font coloring ──
    // Detect content mood and inject scoped CSS to color h1, strong, .big-number
    if (palette) {
      const mood = detectContentMood(slide.title || '', slide.body || '');
      if (mood !== 'NEUTRAL') {
        const dark = isDarkBackground(palette.background);
        const mc = moodTextColors(mood, palette, dark);
        const moodCssLines: string[] = [];
        const moodColor = mc.titleColor;
        // Title + heading colors
        if (moodColor !== palette.text) {
          moodCssLines.push(`h1, h2, h3 { color: ${moodColor} !important; }`);
          moodCssLines.push(`h1::after { background: ${moodColor} !important; }`);
        }
        // Bold/emphasis + list markers + links
        moodCssLines.push(`strong { color: ${mc.emphasisColor} !important; }`);
        moodCssLines.push(`li::marker { color: ${moodColor} !important; }`);
        moodCssLines.push(`a { color: ${moodColor} !important; }`);
        moodCssLines.push(`blockquote { border-left-color: ${moodColor} !important; }`);
        moodCssLines.push(`hr { border-color: ${moodColor} !important; }`);
        // Metric numbers (.big-number, stat values)
        if (mc.metricColor !== palette.primary) {
          moodCssLines.push(`.big-number { color: ${mc.metricColor} !important; }`);
          moodCssLines.push(`.stat-card .big-number { color: ${mc.metricColor} !important; }`);
        }
        if (moodCssLines.length > 0) {
          lines.push(`<style scoped>${moodCssLines.join(' ')}</style>`);
          lines.push('');
        }
      }
    }

    // Body content
    if (slide.body) {
      // Strip any <style scoped> the LLM may have included (we inject our own above)
      const bodyToRender = (slide.body.replace(/<style scoped>[\s\S]*?<\/style>\s*/g, '').trim() || slide.body)
        .replace(/\[([A-Z][a-z]+ ?(needed|statement|here|example|data|TBD))\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .join('\n');

      // Strip meta-narrative phrases from TITLE/CTA slides (LLM artifacts)
      let cleanedBody = bodyToRender;
      if (type === 'TITLE' || type === 'CTA') {
        cleanedBody = cleanedBody
          .split('\n')
          .filter((line: string) => {
            const lower = line.toLowerCase().trim();
            // Remove lines that reference narrative structure, framework labels, or meta commentary
            return !(
              /\b(narrative|framework|journey|arc|story|presentation|deck|slides?)\b.*\b(through|about|covering|exploring|overview|structure)\b/i.test(lower) ||
              /\b(star|situation|task|action|result|mece|pyramid)[-\s]*(framework|principle|structure|method)/i.test(lower) ||
              /\b(this (presentation|deck|slide)|in this|we (will|shall)|let('s| us)|agenda|outline|overview of)\b/i.test(lower) ||
              /\b(table of contents|what we.*cover|here.*what)\b/i.test(lower)
            );
          })
          .join('\n');
      }

      // Escape standalone --- that Marp interprets as slide breaks
      const safeMarpBody = cleanedBody.replace(/^---$/gm, '***');

      // Types that handle their own layout (scoped CSS grids, lead class, etc.) skip glass-card
      const skipGlassCard = ['TITLE', 'CTA', 'VISUAL_HUMOR', 'TEAM', 'TIMELINE', 'METRICS_HIGHLIGHT', 'FEATURE_GRID', 'PRODUCT_SHOWCASE', 'LOGO_WALL', 'MARKET_SIZING', 'SPLIT_STATEMENT'];
      if (type === 'QUOTE') {
        // Wrap body in blockquote
        const quoteLines = safeMarpBody
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `> ${l.replace(/^[-*]\s+/, '')}`);
        lines.push(quoteLines.join('\n'));
      } else if (skipGlassCard.includes(type)) {
        // These types render their own scoped CSS / grid layout directly
        lines.push(safeMarpBody);
      } else {
        // AMI Labs: wrap body content in glass card for content slides
        lines.push('<div class="glass-card">');
        lines.push('');
        lines.push(safeMarpBody);
        lines.push('');
        lines.push('</div>');
      }
      lines.push('');
    }

    // Speaker notes
    if (slide.speakerNotes) {
      lines.push('<!--');
      lines.push(slide.speakerNotes);
      lines.push('-->');
    }

    return lines.join('\n');
  }

  /**
   * Export to PPTX via the PDF-to-images pipeline.
   *
   * Marp CLI's native --pptx flag produces broken output (duplicate slides,
   * no real text elements). Instead we:
   *   1. Render each slide as a JPEG via Marp CLI --images jpeg
   *   2. Build a proper PPTX with PptxGenJS using one full-bleed image per slide
   *
   * Result: visually identical to PDF output, reliable slide count, small file size.
   */
  async exportToPptx(
    marpMarkdown: string,
    outputPath: string,
  ): Promise<string> {
    const resolvedOutput = resolve(outputPath);
    const tempDir = dirname(resolvedOutput);
    await mkdir(tempDir, { recursive: true });

    const tempMdPath = resolvedOutput.replace(/\.pptx$/, '.md');
    await writeFile(tempMdPath, marpMarkdown, 'utf-8');

    // Step 1: Render slides as individual JPEG images via Marp CLI
    const imagesBaseName = resolvedOutput.replace(/\.pptx$/, '');
    try {
      const exitCode = await marpCli([
        tempMdPath,
        '--images', 'jpeg',
        '--html',
        '--jpeg-quality', '85',
        '--allow-local-files',
        '--no-stdin',
        '-o',
        imagesBaseName + '.jpeg',
      ]);
      if (exitCode !== 0) throw new Error('Marp CLI exited with code ' + exitCode);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`Marp image export failed: ${message}`);
      throw new Error(`PPTX export failed (image render): ${message}`);
    }

    // Step 2: Collect generated slide images (Marp outputs: base.001.jpeg, base.002.jpeg, ...)
    const dirFiles = await readdir(tempDir);
    const baseName = imagesBaseName.split(/[\\/]/).pop()!;
    const slideImages = dirFiles
      .filter((f) => f.startsWith(baseName + '.') && f.endsWith('.jpeg') && /\.\d{3}\.jpeg$/.test(f))
      .sort();

    if (slideImages.length === 0) {
      throw new Error('PPTX export failed: no slide images generated by Marp CLI');
    }

    this.logger.log(`Marp rendered ${slideImages.length} slide images`);

    // Step 3: Build PPTX with PptxGenJS Ã¢ÂÂ one full-bleed image per slide
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)

    for (const imgFile of slideImages) {
      const imgPath = join(tempDir, imgFile);
      const imgBuffer = await readFile(imgPath);
      const dataUri = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

      const slide = pres.addSlide();
      slide.addImage({
        data: dataUri,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
      });
    }

    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;
    await writeFile(resolvedOutput, pptxBuffer);

    // Cleanup: remove temp slide images
    for (const imgFile of slideImages) {
      try { await unlink(join(tempDir, imgFile)); } catch { /* ignore */ }
    }

    this.logger.log(`PPTX exported to ${resolvedOutput} (${slideImages.length} slides, ${Math.round(pptxBuffer.length / 1024)}KB)`);
    return resolvedOutput;
  }

  async exportToPdf(
    marpMarkdown: string,
    outputPath: string,
  ): Promise<string> {
    const resolvedOutput = resolve(outputPath);
    const tempDir = dirname(resolvedOutput);
    await mkdir(tempDir, { recursive: true });

    const tempMdPath = resolvedOutput.replace(/\.pdf$/, '.md');
    await writeFile(tempMdPath, marpMarkdown, 'utf-8');

    try {
      const exitCode = await marpCli([
        tempMdPath,
        '--pdf',
        '--html',
        '--allow-local-files',
        '--no-stdin',
        '-o',
        resolvedOutput,
      ]);
      if (exitCode !== 0) throw new Error('Marp CLI exited with code ' + exitCode);

      this.logger.log(`PDF exported to ${resolvedOutput}`);
      return resolvedOutput;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`PDF export failed: ${message}`);
      throw new Error(`PDF export failed: ${message}`);
    }
  }

  /**
   * Render each slide as a JPEG image and return the buffers.
   * Uses Marp CLI --images jpeg. Caller is responsible for storing them.
   */
  async renderSlideImages(marpMarkdown: string): Promise<Buffer[]> {
    const tempDir = join(process.cwd(), 'exports', `preview-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    const tempMdPath = join(tempDir, 'slides.md');
    await writeFile(tempMdPath, marpMarkdown, 'utf-8');

    const imagesBase = join(tempDir, 'slide');

    try {
      const exitCode = await marpCli([
        tempMdPath,
        '--images', 'jpeg',
        '--html',
        '--jpeg-quality', '80',
        '--allow-local-files',
        '--no-stdin',
        '-o',
        imagesBase + '.jpeg',
      ]);
      if (exitCode !== 0) throw new Error('Marp CLI exited with code ' + exitCode);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Preview image render failed: ${message}`);
      return [];
    }

    const dirFiles = await readdir(tempDir);
    const slideImages = dirFiles
      .filter((f) => f.startsWith('slide.') && f.endsWith('.jpeg') && /\.\d{3}\.jpeg$/.test(f))
      .sort();

    const buffers: Buffer[] = [];
    for (const imgFile of slideImages) {
      buffers.push(await readFile(join(tempDir, imgFile)));
    }

    // Cleanup temp files
    for (const f of await readdir(tempDir)) {
      try { await unlink(join(tempDir, f)); } catch { /* ignore */ }
    }
    try { await (await import('fs/promises')).rmdir(tempDir); } catch { /* ignore */ }

    this.logger.log(`Rendered ${buffers.length} slide preview images`);

    // Post-render validation (non-blocking — logs warnings, doesn't throw)
    if (buffers.length > 0) {
      const validation = this.validateRenderedSlides(buffers, buffers.length);
      if (!validation.valid) {
        this.logger.warn(`Slide render validation: ${validation.summary}`);
        for (const r of validation.results.filter(r => !r.valid)) {
          this.logger.warn(`  Slide ${r.slideIndex + 1}: ${r.issues.join(', ')}`);
        }
      }
      this.logger.log(`Render validation: ${validation.summary}`);
    }

    return buffers;
  }

  validateRenderedSlides(
    buffers: Buffer[],
    expectedCount: number,
  ): { valid: boolean; results: Array<{ slideIndex: number; fileSize: number; valid: boolean; issues: string[] }>; summary: string } {
    const results: Array<{ slideIndex: number; fileSize: number; valid: boolean; issues: string[] }> = [];

    if (buffers.length !== expectedCount) {
      return { valid: false, results: [], summary: `Expected ${expectedCount} slides, got ${buffers.length}` };
    }

    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      const issues: string[] = [];

      const MIN_SLIDE_SIZE = 10_000;
      if (buf.length < MIN_SLIDE_SIZE) {
        issues.push(`Too small (${(buf.length / 1024).toFixed(1)}KB) — likely blank or broken`);
      }

      if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
        issues.push('Invalid JPEG header');
      }

      const dims = parseJpegDimensions(buf);
      if (dims && (dims.width !== 1280 || dims.height !== 720)) {
        issues.push(`Wrong dimensions: ${dims.width}x${dims.height}, expected 1280x720`);
      }

      results.push({ slideIndex: i, fileSize: buf.length, valid: issues.length === 0, issues });
    }

    const failCount = results.filter(r => !r.valid).length;
    return {
      valid: failCount === 0,
      results,
      summary: failCount === 0
        ? `All ${buffers.length} slides valid (avg ${(buffers.reduce((a, b) => a + b.length, 0) / buffers.length / 1024).toFixed(1)}KB)`
        : `${failCount}/${buffers.length} slides failed validation`,
    };
  }
}
