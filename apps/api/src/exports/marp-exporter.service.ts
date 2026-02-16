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
  generateMarpAccentRotationCSS,
  generateLeadEnhancementCSS,
  generateMarpMcKinseyCSS,
  generateMarpMcKinseyTableCSS,
  generateMarpMcKinseyLeadCSS,
} from './slide-visual-theme.js';

const execFileAsync = promisify(execFile);

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
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;
    const sections: string[] = [];
    const isMcKinsey = theme.name === 'mckinsey-executive';

    // ── Contrast-safe color computation ───────────────────
    const bg = palette.background;
    const safeText = ensureContrast(palette.text, bg, 7.0);
    const safePrimary = ensureContrast(palette.primary, bg, 4.5);
    const safeAccent = ensureContrast(palette.accent, bg, 4.5);
    const safeSecondary = ensureContrast(palette.secondary, bg, 4.5);
    const safeSuccess = ensureContrast(palette.success, bg, 4.5);
    const safeError = ensureContrast(palette.error, bg, 4.5);

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

    // McKinsey uses serif heading + sans-serif body; fallback stacks differ
    const headingFontStack = isMcKinsey
      ? `'${theme.headingFont}', serif`
      : `'${theme.headingFont}', sans-serif`;
    const bodyFontStack = isMcKinsey
      ? `'${theme.bodyFont}', sans-serif`
      : `'${theme.bodyFont}', sans-serif`;

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
      `    color: ${safeText};`,
      `    font-family: ${bodyFontStack};`,
      `    font-size: ${isMcKinsey ? '24px' : '26px'};`,
      '    overflow: hidden;',
      '    padding: 40px 50px 50px 50px;',
      '    display: flex;',
      '    flex-direction: column;',
      '    justify-content: flex-start;',
      '  }',
      '  section > * {',
      '    flex-shrink: 1;',
      '  }',
      '  section table {',
      '    font-size: 0.75em;',
      '  }',
      '  section h1 + table, section h1 + p + table, section p + table {',
      '    margin-top: 0.3em;',
      '  }',
      '  h1 {',
      `    color: ${safePrimary};`,
      `    font-family: ${headingFontStack};`,
      `    font-size: ${isMcKinsey ? '1.6em' : '1.5em'};`,
      '    margin-top: 0;',
      '    margin-bottom: 0.2em;',
      '  }',
      '  h2 {',
      `    color: ${safeText};`,
      `    font-family: ${headingFontStack};`,
      '    font-size: 1.0em;',
      '    margin-top: 0.1em;',
      '    margin-bottom: 0.2em;',
      '  }',
      '  h3 {',
      `    color: ${safeAccent};`,
      `    font-family: ${headingFontStack};`,
      '    font-size: 0.85em;',
      '    margin-top: 0.2em;',
      '    margin-bottom: 0.1em;',
      '  }',
      '  p, li {',
      '    font-size: 0.75em;',
      '    line-height: 1.3;',
      '    margin-top: 0.1em;',
      '    margin-bottom: 0.1em;',
      `    color: ${safeText};`,
      '  }',
      '  strong {',
      `    color: ${isMcKinsey ? safePrimary : safeAccent};`,
      '  }',
      '  em {',
      `    color: ${safeSecondary};`,
      '  }',
      '  a {',
      `    color: ${safeAccent};`,
      '    text-decoration: none;',
      '  }',
    ];

    // Table + blockquote CSS: McKinsey gets clean horizontal-only borders
    if (isMcKinsey) {
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
        '    width: 100%;',
        '    border-collapse: collapse;',
        '    font-size: 0.75em;',
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
        '  }',
      );
    }

    frontmatter.push(
      '  code {',
      `    background-color: ${palette.surface};`,
      '    padding: 0.2em 0.4em;',
      `    border-radius: ${isMcKinsey ? '2px' : '4px'};`,
      '    font-size: 0.85em;',
      '  }',
      '  .source {',
      `    font-size: ${isMcKinsey ? '0.45em' : '0.55em'};`,
      `    color: ${isMcKinsey ? '#A0A0A0' : safeSecondary};`,
      '  }',
      `  .gold { color: ${safeAccent}; }`,
      `  .green { color: ${safeSuccess}; }`,
      `  .red { color: ${safeError}; }`,
    );

    // Background variants + accent rotation + lead styling (theme-conditional)
    if (isMcKinsey) {
      frontmatter.push(generateMarpMcKinseyCSS(palette));
      // No accent rotation — McKinsey uses uniform navy bold
      frontmatter.push(generateMarpMcKinseyLeadCSS(palette));
    } else {
      frontmatter.push(generateMarpBackgroundCSS(palette, bg, gradientEnd));
      frontmatter.push(generateMarpAccentRotationCSS(safeAccent, safePrimary, safeSuccess, safeSecondary));
      frontmatter.push(generateLeadEnhancementCSS(safeAccent));
    }

    frontmatter.push(
      '  section::after {',
      `    color: ${isMcKinsey ? '#A0A0A0' : palette.border};`,
      '    font-size: 0.6em;',
      '  }',
      '  ul, ol { margin-top: 0.2em; margin-bottom: 0.2em; padding-left: 1.2em; }',
      '  ul { list-style-type: disc; }',
      '  ul ul { list-style-type: circle; }',
      '  li { margin-bottom: 0.15em; line-height: 1.3; }',
      '  img { max-height: 280px; margin: 4px auto; }',
      '---',
    );

    sections.push(frontmatter.join('\n'));

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    for (const slide of sortedSlides) {
      sections.push(this.buildSlideMarkdown(slide, bg, imageLayout));
    }

    return sections.join('\n\n---\n\n');
  }

  private buildSlideMarkdown(slide: SlideModel, bgColor?: string, imageLayout?: string): string {
    const lines: string[] = [];
    const type = slide.slideType;
    const bgVariant = getSlideBackground(type, slide.slideNumber, bgColor);

    // Per-slide background + type-specific Marp directives
    if (type === 'TITLE' || type === 'CTA') {
      lines.push(`<!-- _class: lead ${bgVariant.className} -->`);
      lines.push('<!-- _paginate: false -->');
      // Override Marp's global backgroundColor for divider slides
      if (bgVariant.className === 'bg-section-divider') {
        lines.push('<!-- _backgroundColor: #051C2C -->');
        lines.push('<!-- _color: #FFFFFF -->');
      }
      lines.push('');
    } else {
      lines.push(`<!-- _class: ${bgVariant.className} -->`);
      lines.push('');
    }

    // Title
    if (slide.title) {
      lines.push(`# ${slide.title}`);
      lines.push('');
    }

    // Image placement — varies by slide type and imageLayout setting
    if (slide.imageUrl) {
      if (type === 'TITLE' || type === 'CTA') {
        // Always background for hero slides regardless of setting
        lines.push(`![bg opacity:0.15](${slide.imageUrl})`);
      } else if (imageLayout === 'BACKGROUND') {
        // User chose background layout for all slides
        lines.push(`![bg opacity:0.15](${slide.imageUrl})`);
      } else {
        // Default: right-side image (35% width)
        lines.push(`![bg right:35%](${slide.imageUrl})`);
      }
      lines.push('');
    }

    // Body content — varies by slide type
    if (slide.body) {
      if (type === 'QUOTE') {
        // Wrap body in blockquote
        const quoteLines = slide.body
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `> ${l.replace(/^[-*]\s+/, '')}`);
        lines.push(quoteLines.join('\n'));
      } else {
        lines.push(slide.body);
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
