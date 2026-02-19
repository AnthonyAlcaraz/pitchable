import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { writeFile, mkdir, readFile, readdir, unlink } from 'fs/promises';
import { dirname, resolve, join } from 'path';
import { promisify } from 'util';
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
  generateMarpBackgroundCSS,
  generateBackgroundShades,
  generateMarpAccentRotationCSS,
  generateLeadEnhancementCSS,
  generateMarpMcKinseyCSS,
  generateMarpMcKinseyTableCSS,
  generateMarpMcKinseyLeadCSS,
} from './slide-visual-theme.js';
import {
  FIGMA_GRADE_TYPES,
  buildHtmlSlideContent,
} from './html-slide-templates.js';

const execFileAsync = promisify(execFile);

// ── Layout profiles ──────────────────────────────────────────
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

// ── Color contrast helpers ──────────────────────────────────

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

/** Convert hex to hex+alpha suffix (e.g. #0f172a + 0.9 → #0f172ae6). */
function hexWithAlpha(hex: string, alpha: number): string {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
}

// ── Palette interface ───────────────────────────────────────

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

@Injectable()
export class MarpExporterService {
  private readonly logger = new Logger(MarpExporterService.name);

  generateMarpMarkdown(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
    imageLayout?: string,
    layoutProfile: LayoutProfile = 'startup',
    rendererOverrides?: Map<number, string>,
    figmaBackgrounds?: Map<number, string>,
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;
    const sections: string[] = [];
    const profile = LAYOUT_PROFILE_CONFIGS[layoutProfile];
    // McKinsey theme always forces consulting profile behavior
    const isMcKinsey = theme.name === 'mckinsey-executive';
    const isConsulting = isMcKinsey || layoutProfile === 'consulting';

    // ── Contrast-safe color computation ───────────────────
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
      this.logger.debug(`[CONTRAST] Theme "${theme.name}" — all ${contrastPairs.length} color pairs pass WCAG AA+`);
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
      '    font-size: 0.82em;',
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
      '    font-size: 0.95em;',
      '    margin-top: 0.2em;',
      '    margin-bottom: 0.15em;',
      '  }',
      '  p, li {',
      '    font-size: 0.85em;',
      '    line-height: 1.4;',
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
        '    font-size: 0.82em;',
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
      // No accent rotation — consulting uses uniform primary bold
      frontmatter.push(generateMarpMcKinseyLeadCSS(palette));
    } else if (!profile.bokeh) {
      // Corporate/technical: backgrounds but no bokeh radial glows
      const bgShades = isDarkBackground(bg) ? generateBackgroundShades(bg, safeText) : undefined;
      frontmatter.push(generateMarpBackgroundCSS(palette, bg, gradientEnd, bgShades));
      frontmatter.push(generateMarpAccentRotationCSS(safeAccent, safePrimary, safeSuccess, safeSecondary));
      frontmatter.push(generateLeadEnhancementCSS(safeAccent, safeText));
      // Tone down radial-glow by overriding its opacity
      if (profile.bgDecorationOpacity < 1.0) {
        frontmatter.push(
          `  section.bg-radial-glow::before { opacity: ${(0.15 * profile.bgDecorationOpacity).toFixed(2)} !important; }`,
          `  section.bg-radial-glow::after { opacity: ${(0.10 * profile.bgDecorationOpacity).toFixed(2)} !important; }`,
        );
      }
    } else {
      // Startup/creative: full background effects
      const bgShades = isDarkBackground(bg) ? generateBackgroundShades(bg, safeText) : undefined;
      frontmatter.push(generateMarpBackgroundCSS(palette, bg, gradientEnd, bgShades));
      frontmatter.push(generateMarpAccentRotationCSS(safeAccent, safePrimary, safeSuccess, safeSecondary));
      frontmatter.push(generateLeadEnhancementCSS(safeAccent, safeText));
    }

    frontmatter.push(
      '  section::after {',
      `    color: ${isConsulting ? '#A0A0A0' : palette.border};`,
      '    font-size: 0.6em;',
      '  }',
      '  ul, ol { margin-top: 0.2em; margin-bottom: 0.2em; padding-left: 1.2em; }',
      '  ul { list-style-type: disc; }',
      '  ul ul { list-style-type: circle; }',
      '  li { margin-bottom: 0.15em; line-height: 1.3; }',
      '  li::marker { color: var(--accent); }',
      // Layout classes for content centering/spreading
      '  section.content-center { justify-content: center; }',
      '  section.content-spread { justify-content: space-between; }',
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

    sections.push(frontmatter.join('\n'));

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    for (const slide of sortedSlides) {
      const rendererOverride = rendererOverrides?.get(slide.slideNumber);
      const figmaBg = figmaBackgrounds?.get(slide.slideNumber);
      sections.push(this.buildSlideMarkdown(slide, bg, imageLayout, safePrimary, profile, palette, rendererOverride, figmaBg));
    }

    return sections.join('\n\n---\n\n');
  }

  private buildSlideMarkdown(slide: SlideModel, bgColor?: string, imageLayout?: string, primaryColor?: string, profile?: LayoutProfileConfig, palette?: ColorPalette, rendererOverride?: string, figmaBackground?: string): string {
    const lines: string[] = [];
    const type = slide.slideType;
    const bgVariant = getSlideBackground(type, slide.slideNumber, bgColor);

    // Layout class by type
    const centerTypes = ['QUOTE', 'COMPARISON', 'MARKET_SIZING', 'LOGO_WALL'];
    const spreadTypes = ['DATA_METRICS', 'METRICS_HIGHLIGHT', 'ARCHITECTURE', 'PROCESS', 'FEATURE_GRID', 'TIMELINE', 'PRODUCT_SHOWCASE', 'SPLIT_STATEMENT'];
    const layoutClass = centerTypes.includes(type) ? ' content-center'
      : spreadTypes.includes(type) ? ' content-spread'
      : '';

    // Per-slide background + type-specific Marp directives
    if (type === 'SECTION_DIVIDER') {
      // Full-bleed accent background, centered text, no pagination
      lines.push('<!-- _class: lead -->');
      lines.push('<!-- _paginate: skip -->');
      lines.push(`<!-- _backgroundColor: ${primaryColor || '#1e3a5f'} -->`);
      lines.push('<!-- _color: #FFFFFF -->');
      lines.push('');
    } else if (type === 'VISUAL_HUMOR') {
      // Image-forward humor slide: full-screen image, centered text overlay
      lines.push('<!-- _class: lead -->');
      lines.push('<!-- _paginate: false -->');
      lines.push('');
    } else if (type === 'TITLE' || type === 'CTA') {
      lines.push(`<!-- _class: lead ${bgVariant.className} -->`);
      lines.push('<!-- _paginate: false -->');
      // Override Marp's global backgroundColor for divider slides
      if (bgVariant.className === 'bg-section-divider') {
        lines.push('<!-- _backgroundColor: #051C2C -->');
        lines.push('<!-- _color: #FFFFFF -->');
      }
      lines.push('');
    } else if (type === 'METRICS_HIGHLIGHT') {
      lines.push(`<!-- _class: lead ${bgVariant.className} -->`);
      lines.push('');
    } else {
      lines.push(`<!-- _class: ${bgVariant.className}${layoutClass} -->`);
      lines.push('');
    }

    // Figma template background: full-bleed behind all content
    if (figmaBackground) {
      lines.push(`![bg](${figmaBackground})`);
      lines.push('');
    }

    // AI renderer override: upgrade slide to a visual template when content matches
    if (rendererOverride && FIGMA_GRADE_TYPES.has(rendererOverride) && palette) {
      lines.push(buildHtmlSlideContent(
        { title: slide.title, body: slide.body || '', slideType: rendererOverride },
        palette,
      ));
      lines.push('');
      if (slide.speakerNotes) {
        lines.push('<!--');
        lines.push(slide.speakerNotes);
        lines.push('-->');
      }
      return lines.join('\n');
    }

    // Figma-grade HTML+SVG dispatch for complex slide types
    if (FIGMA_GRADE_TYPES.has(type) && palette) {
      lines.push(buildHtmlSlideContent(
        { title: slide.title, body: slide.body || '', slideType: type },
        palette,
      ));
      lines.push('');
      if (slide.speakerNotes) {
        lines.push('<!--');
        lines.push(slide.speakerNotes);
        lines.push('-->');
      }
      return lines.join('\n');
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
      lines.push(`# ${slide.title}`);
      lines.push('');
    }

    // SECTION_DIVIDER: title only, no body/image/notes
    if (type === 'SECTION_DIVIDER') {
      return lines.join('\n');
    }

    // Image placement — varies by slide type and imageLayout setting
    if (slide.imageUrl) {
      if (type === 'VISUAL_HUMOR') {
        // Full-screen background at high visibility — image IS the slide
        lines.push(`![bg brightness:0.7](${slide.imageUrl})`);
      } else if (type === 'TITLE' || type === 'CTA') {
        // Always background for hero slides regardless of setting
        lines.push(`![bg opacity:0.15](${slide.imageUrl})`);
      } else if (type === 'QUOTE' && imageLayout !== 'BACKGROUND') {
        // Blurred background for cinematic testimonial feel
        lines.push(`![bg blur:12px brightness:0.3](${slide.imageUrl})`);
      } else if (type === 'SOLUTION' && imageLayout !== 'BACKGROUND') {
        // Left-side image to mirror PROBLEM's right-side
        lines.push(`![bg left:40%](${slide.imageUrl})`);
      } else if (type === 'ARCHITECTURE' && imageLayout !== 'BACKGROUND') {
        // Contain (not cover) to preserve diagram integrity
        lines.push(`![bg right:40% contain](${slide.imageUrl})`);
      } else if (type === 'PRODUCT_SHOWCASE') {
        // Right-side product mockup — larger (45%) and contained to show full screenshot
        lines.push(`![bg right:45% contain](${slide.imageUrl})`);
      } else if (imageLayout === 'BACKGROUND') {
        // User chose background layout for all slides
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
.split-statement { display: grid; grid-template-columns: 30% 1fr; gap: 32px; align-items: center; min-height: 280px; }
.statement { font-size: 1.6em; font-weight: 800; line-height: 1.15; }
.evidence { font-size: 0.75em; }
.evidence strong { display: block; font-size: 1.1em; margin-bottom: 2px; margin-top: 12px; }
.evidence hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 10px 0; }
</style>`,
    };
    if (scopedCSS[type]) {
      lines.push(scopedCSS[type]);
      lines.push('');
    }

    // Body content
    if (slide.body) {
      // Strip any <style scoped> the LLM may have included (we inject our own above)
      const bodyToRender = slide.body.replace(/<style scoped>[\s\S]*?<\/style>\s*/g, '').trim() || slide.body;

      // Types that handle their own layout (scoped CSS grids, lead class, etc.) skip glass-card
      const skipGlassCard = ['TITLE', 'CTA', 'VISUAL_HUMOR', 'TEAM', 'TIMELINE', 'METRICS_HIGHLIGHT', 'FEATURE_GRID', 'PRODUCT_SHOWCASE', 'LOGO_WALL', 'MARKET_SIZING', 'SPLIT_STATEMENT'];
      if (type === 'QUOTE') {
        // Wrap body in blockquote
        const quoteLines = bodyToRender
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `> ${l.replace(/^[-*]\s+/, '')}`);
        lines.push(quoteLines.join('\n'));
      } else if (skipGlassCard.includes(type)) {
        // These types render their own scoped CSS / grid layout directly
        lines.push(bodyToRender);
      } else {
        // AMI Labs: wrap body content in glass card for content slides
        lines.push('<div class="glass-card">');
        lines.push('');
        lines.push(bodyToRender);
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
      await execFileAsync('npx', [
        '@marp-team/marp-cli',
        shellSafePath(tempMdPath),
        '--images', 'jpeg',
        '--html',
        '--jpeg-quality', '85',
        '--allow-local-files',
        '--no-stdin',
        '-o',
        shellSafePath(imagesBaseName + '.jpeg'),
      ], { timeout: 300_000, shell: true });
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

    // Step 3: Build PPTX with PptxGenJS — one full-bleed image per slide
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
      await execFileAsync('npx', [
        '@marp-team/marp-cli',
        shellSafePath(tempMdPath),
        '--pdf',
        '--html',
        '--allow-local-files',
        '--no-stdin',
        '-o',
        shellSafePath(resolvedOutput),
      ], { timeout: 300_000, shell: true });

      this.logger.log(`PDF exported to ${resolvedOutput}`);
      return resolvedOutput;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`PDF export failed: ${message}`);
      throw new Error(`PDF export failed: ${message}`);
    }
  }
}
