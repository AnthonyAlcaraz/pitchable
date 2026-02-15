import { Injectable, Logger } from '@nestjs/common';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import PptxGenJS from 'pptxgenjs';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';

// ── Types ──────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────

/** Strip '#' prefix for PptxGenJS hex colors */
function hex(color: string): string {
  return color.replace(/^#/, '');
}

/** Darken a hex color by a percentage (0-1) */
function darken(color: string, amount: number): string {
  const c = hex(color);
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/** Lighten a hex color by mixing toward white */
function lighten(color: string, amount: number): string {
  const c = hex(color);
  const num = parseInt(c, 16);
  const r = Math.min(255, Math.floor(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.floor((num & 0xff) + (255 - (num & 0xff)) * amount));
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/** Convert a percentage string like '55%' to inches (based on slide height 7.5) */
function pctToInchesY(pct: string | number): number {
  if (typeof pct === 'number') return pct;
  const match = String(pct).match(/^([\d.]+)%$/);
  if (match) return (parseFloat(match[1]) / 100) * 7.5;
  return parseFloat(String(pct)) || 0;
}

/** Convert a percentage string to inches (based on slide width 13.33) */
function pctToInchesX(pct: string | number): number {
  if (typeof pct === 'number') return pct;
  const match = String(pct).match(/^([\d.]+)%$/);
  if (match) return (parseFloat(match[1]) / 100) * 13.33;
  return parseFloat(String(pct)) || 0;
}

// ── Service ────────────────────────────────────────────────

@Injectable()
export class PptxGenJsExporterService {
  private readonly logger = new Logger(PptxGenJsExporterService.name);

  async exportToPptx(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): Promise<Buffer> {
    const palette = theme.colorPalette as unknown as ColorPalette;
    const pres = new PptxGenJS();

    pres.title = presentation.title;
    pres.author = 'Pitchable';
    pres.layout = 'LAYOUT_WIDE'; // 16:9

    // Define slide masters
    pres.defineSlideMaster({
      title: 'PITCHABLE_DARK',
      background: { color: hex(palette.background) },
    });

    pres.defineSlideMaster({
      title: 'PITCHABLE_ACCENT',
      background: { color: darken(palette.background, 0.15) },
    });

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );
    const totalSlides = sortedSlides.length;

    // Pre-download all images as base64 data URIs (PptxGenJS can't fetch http:// URLs)
    const imageCache = await this.preDownloadImages(sortedSlides);

    for (const slide of sortedSlides) {
      this.addSlide(pres, slide, palette, theme, totalSlides, imageCache);
    }

    const output = await pres.write({ outputType: 'nodebuffer' });
    this.logger.log(
      `PPTX generated: "${presentation.title}" (${totalSlides} slides)`,
    );
    return output as Buffer;
  }

  /**
   * Pre-download all slide images as base64 data URIs.
   * PptxGenJS `path` property doesn't handle http:// URLs reliably.
   */
  private async preDownloadImages(
    slides: SlideModel[],
  ): Promise<Map<string, string>> {
    const cache = new Map<string, string>();

    await Promise.all(
      slides.map(async (slide) => {
        if (!slide.imageUrl) return;
        try {
          const dataUri = await this.downloadAsDataUri(slide.imageUrl);
          cache.set(slide.id, dataUri);
          this.logger.debug(`Pre-downloaded image for slide ${slide.id}`);
        } catch (err) {
          this.logger.warn(
            `Failed to pre-download image for slide ${slide.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );

    this.logger.log(`Pre-downloaded ${cache.size}/${slides.filter((s) => s.imageUrl).length} images`);
    return cache;
  }

  /**
   * Download a URL (http or https) and return as base64 data URI.
   */
  private downloadAsDataUri(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const getter = url.startsWith('https') ? httpsGet : httpGet;
      getter(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] ?? 'image/png';
          const base64 = buffer.toString('base64');
          resolve(`data:${contentType};base64,${base64}`);
        });
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  // ── Slide Router ─────────────────────────────────────────

  private addSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
    imageCache: Map<string, string>,
  ): void {
    // Replace imageUrl with cached base64 data URI if available
    const cachedSlide = imageCache.has(slide.id)
      ? { ...slide, imageUrl: imageCache.get(slide.id)! }
      : slide;

    switch (slide.slideType) {
      case 'TITLE':
        this.addTitleSlide(pres, cachedSlide, palette, theme);
        break;
      case 'CTA':
        this.addCTASlide(pres, cachedSlide, palette, theme);
        break;
      case 'QUOTE':
        this.addQuoteSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
      case 'ARCHITECTURE':
        this.addArchitectureSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
      case 'COMPARISON':
        this.addComparisonSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
      case 'DATA_METRICS':
        this.addDataMetricsSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
      case 'PROCESS':
        this.addProcessSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
      case 'PROBLEM':
        this.addAccentBarSlide(pres, cachedSlide, palette, theme, totalSlides, palette.error);
        break;
      case 'SOLUTION':
        this.addAccentBarSlide(pres, cachedSlide, palette, theme, totalSlides, palette.success);
        break;
      default:
        this.addContentSlide(pres, cachedSlide, palette, theme, totalSlides);
        break;
    }
  }

  // ── TITLE Slide (AWS-cover style) ─────────────────────────

  private addTitleSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_ACCENT' });

    // Full gradient overlay for depth (cover-style)
    this.addGradientOverlay(s, palette);

    // Top accent bar spanning full width
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.06,
      fill: { color: hex(palette.accent) },
    });

    // Background image at low opacity (if available)
    if (slide.imageUrl) {
      try {
        s.addImage({
          data: slide.imageUrl,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          transparency: 85,
        });
      } catch {
        // Image load failed — continue without
      }
    }

    // Accent line separator — positioned above the title block at 50%
    s.addShape('rect', {
      x: 0.8,
      y: '50%',
      w: 2.5,
      h: 0.04,
      fill: { color: hex(palette.accent) },
    });

    // Title — large, bold, left-aligned at bottom-left (AWS cover style)
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.8,
        y: '53%',
        w: '80%',
        h: 1.4,
        fontSize: 44,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
        align: 'left',
        valign: 'top',
      });
    }

    // Subtitle from body — accent color (cyan), below title
    if (slide.body) {
      const subtitleLines = slide.body
        .split('\n')
        .filter((l) => l.trim())
        .slice(0, 3)
        .map((l) => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim());

      s.addText(subtitleLines.join('\n'), {
        x: 0.8,
        y: '68%',
        w: '80%',
        h: 0.8,
        fontSize: 20,
        fontFace: theme.bodyFont,
        color: hex(palette.accent),
        align: 'left',
        valign: 'top',
        lineSpacingMultiple: 1.3,
      });
    }

    // Author / branding at bottom-left
    s.addText('Pitchable', {
      x: 0.8,
      y: '90%',
      w: 3,
      h: 0.35,
      fontSize: 10,
      fontFace: theme.bodyFont,
      color: hex(palette.border),
      align: 'left',
      valign: 'middle',
    });

    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── CTA Slide (Z4-style centered with accent) ───────────

  private addCTASlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_ACCENT' });

    this.addGradientOverlay(s, palette);

    // Background image at low opacity
    if (slide.imageUrl) {
      try {
        s.addImage({
          data: slide.imageUrl,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          transparency: 85,
        });
      } catch {
        // continue
      }
    }

    // Accent line at top
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.06,
      fill: { color: hex(palette.accent) },
    });

    // Title — large, bold, centered
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.8,
        y: '15%',
        w: '85%',
        h: 1.0,
        fontSize: 36,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Body — centered card with surface background
    if (slide.body) {
      // Card background
      s.addShape('roundRect', {
        x: 1.5,
        y: '35%',
        w: 10.33,
        h: '40%',
        fill: { color: hex(palette.surface) },
        rectRadius: 0.15,
      });
      // Cyan accent bar on card
      s.addShape('rect', {
        x: 1.5,
        y: '35%',
        w: 10.33,
        h: 0.06,
        fill: { color: hex(palette.accent) },
      });

      this.parseRichBody(s, slide.body, palette, theme, {
        x: 2.0,
        y: '39%',
        w: 9.33,
        maxH: '33%',
        baseFontSize: 18,
      });
    }

    // Footer CTA text
    s.addText('Pitchable', {
      x: 0.5,
      y: '90%',
      w: 3,
      h: 0.35,
      fontSize: 10,
      fontFace: theme.bodyFont,
      color: hex(palette.border),
    });

    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── QUOTE Slide ──────────────────────────────────────────

  private addQuoteSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    // Accent left border
    s.addShape('rect', {
      x: 0.8,
      y: '20%',
      w: 0.06,
      h: '55%',
      fill: { color: hex(palette.accent) },
    });

    // Large opening quote mark
    s.addText('\u201c', {
      x: 1.2,
      y: '15%',
      w: 1.0,
      h: 1.0,
      fontSize: 80,
      fontFace: theme.headingFont,
      color: hex(palette.primary),
      transparency: 50,
    });

    // Title as quote context/heading
    if (slide.title) {
      s.addText(slide.title, {
        x: 1.2,
        y: '22%',
        w: '75%',
        h: 0.6,
        fontSize: 22,
        fontFace: theme.headingFont,
        color: hex(palette.accent),
        bold: true,
      });
    }

    // Body as quote text
    if (slide.body) {
      const lines = slide.body.split('\n').filter((l) => l.trim());
      // Separate attribution line (starts with *— or — or *)
      const attrIdx = lines.findIndex((l) => /^\*?—/.test(l.trim()) || /^\*—/.test(l.trim()));
      const quoteLines = attrIdx > -1 ? lines.slice(0, attrIdx) : lines;
      const attrLine = attrIdx > -1 ? lines[attrIdx].replace(/^\*|\*$/g, '').trim() : '';

      const quoteText = quoteLines.map((l) => l.replace(/^[-*]\s+/, '').trim()).join('\n');

      s.addText(quoteText, {
        x: 1.2,
        y: '35%',
        w: '75%',
        h: '30%',
        fontSize: 20,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        italic: true,
        valign: 'top',
        lineSpacingMultiple: 1.4,
      });

      // Attribution
      if (attrLine) {
        s.addText(attrLine, {
          x: 1.2,
          y: '68%',
          w: '75%',
          h: 0.4,
          fontSize: 14,
          fontFace: theme.bodyFont,
          color: hex(palette.secondary),
          italic: true,
        });
      }
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── ARCHITECTURE Slide ───────────────────────────────────

  private addArchitectureSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    // Accent line above title
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(palette.primary) },
    });

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: '92%',
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
      });
    }

    if (slide.imageUrl) {
      // Full-width image below title (architecture diagram focus)
      try {
        s.addImage({
          data: slide.imageUrl,
          x: '5%',
          y: 1.2,
          w: '90%',
          h: '62%',
        });
      } catch {
        // Fallback to body text if image fails
        this.addBodyFallback(s, slide, palette, theme);
      }

      // Compact body below image (if space) — use rich body parser
      if (slide.body) {
        this.parseRichBody(s, slide.body, palette, theme, {
          x: 0.5,
          y: '82%',
          w: '92%',
          maxH: '12%',
          baseFontSize: 12,
        });
      }
    } else {
      // No image — body fills the space, centered
      if (slide.body) {
        this.parseRichBody(s, slide.body, palette, theme, {
          x: 0.8,
          y: 1.2,
          w: '85%',
          maxH: '55%',
          baseFontSize: 14,
        });
      }
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── COMPARISON Slide (Z4-style cards) ───────────────────

  private addComparisonSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    // Accent line above title
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(palette.primary) },
    });

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: '92%',
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
      });
    }

    // Split body into two columns — detect blank-line separator or midpoint
    const bodyLines = (slide.body ?? '').split('\n');
    const blankIdx = bodyLines.findIndex((l, i) => i > 0 && !l.trim() && i < bodyLines.length - 1);
    let leftLines: string[];
    let rightLines: string[];
    if (blankIdx > 0) {
      leftLines = bodyLines.slice(0, blankIdx).filter((l) => l.trim());
      rightLines = bodyLines.slice(blankIdx + 1).filter((l) => l.trim());
    } else {
      const filtered = bodyLines.filter((l) => l.trim());
      const mid = Math.ceil(filtered.length / 2);
      leftLines = filtered.slice(0, mid);
      rightLines = filtered.slice(mid);
    }

    // Extract card headers from **bold header** lines
    const extractHeader = (lines: string[]): { header: string; content: string[] } => {
      if (lines.length > 0 && /^\*\*(.+?)\*\*$/.test(lines[0].trim())) {
        const match = lines[0].trim().match(/^\*\*(.+?)\*\*$/);
        return { header: match ? match[1] : '', content: lines.slice(1) };
      }
      return { header: '', content: lines };
    };

    const left = extractHeader(leftLines);
    const right = extractHeader(rightLines);

    // Card dimensions (Z4-style: two side-by-side rounded cards)
    const cardW = 5.8;
    const cardH = 3.8;
    const cardY = 1.3;
    const leftX = 0.5;
    const rightX = 6.85;
    const gap = 0.3;

    // Determine accent colors — left=error (red) for problems, right=success (green) for solutions
    const leftAccent = palette.error;
    const rightAccent = palette.success;

    // Left card background
    s.addShape('roundRect', {
      x: leftX,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: hex(palette.surface) },
      rectRadius: 0.1,
    });
    // Left card accent bar (top)
    s.addShape('rect', {
      x: leftX,
      y: cardY,
      w: cardW,
      h: 0.06,
      fill: { color: hex(leftAccent) },
    });

    // Right card background
    s.addShape('roundRect', {
      x: rightX,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: hex(palette.surface) },
      rectRadius: 0.1,
    });
    // Right card accent bar (top)
    s.addShape('rect', {
      x: rightX,
      y: cardY,
      w: cardW,
      h: 0.06,
      fill: { color: hex(rightAccent) },
    });

    // Left card header
    if (left.header) {
      s.addText(left.header, {
        x: leftX + 0.3,
        y: cardY + 0.2,
        w: cardW - 0.6,
        h: 0.4,
        fontSize: 16,
        fontFace: theme.headingFont,
        color: hex(palette.accent),
        bold: true,
      });
    }
    // Left card content
    if (left.content.length > 0) {
      this.parseRichBody(s, left.content.join('\n'), palette, theme, {
        x: leftX + 0.3,
        y: cardY + (left.header ? 0.7 : 0.2),
        w: cardW - 0.6,
        maxH: cardH - (left.header ? 1.0 : 0.4),
        baseFontSize: 13,
      });
    }

    // Right card header
    if (right.header) {
      s.addText(right.header, {
        x: rightX + 0.3,
        y: cardY + 0.2,
        w: cardW - 0.6,
        h: 0.4,
        fontSize: 16,
        fontFace: theme.headingFont,
        color: hex(palette.accent),
        bold: true,
      });
    }
    // Right card content
    if (right.content.length > 0) {
      this.parseRichBody(s, right.content.join('\n'), palette, theme, {
        x: rightX + 0.3,
        y: cardY + (right.header ? 0.7 : 0.2),
        w: cardW - 0.6,
        maxH: cardH - (right.header ? 1.0 : 0.4),
        baseFontSize: 13,
      });
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── DATA_METRICS Slide ───────────────────────────────────

  private addDataMetricsSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '58%' : '90%';

    // Accent line above title
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(palette.primary) },
    });

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
      });
    }

    // Body — use rich body parser which falls through to data metrics formatting
    // for lines that are not tables/H3/blockquotes/sources
    if (slide.body) {
      this.parseRichBody(s, slide.body, palette, theme, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        maxH: '52%',
        baseFontSize: 14,
      });
    }

    // Image on right
    if (hasImage) {
      this.addRightImage(s, slide);
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── PROCESS Slide ────────────────────────────────────────

  private addProcessSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '58%' : '90%';

    // Accent line above title
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(palette.primary) },
    });

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
      });
    }

    // Body as numbered steps — use rich body for tables/H3/sources,
    // but process-style formatting for plain text lines
    if (slide.body) {
      this.parseRichBody(s, slide.body, palette, theme, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        maxH: '52%',
        baseFontSize: 14,
      });
    }

    if (hasImage) {
      this.addRightImage(s, slide);
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── PROBLEM / SOLUTION Slide (with accent bar) ──────────

  private addAccentBarSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
    accentColor: string,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    // Left accent bar (red for PROBLEM, green for SOLUTION)
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.08,
      h: '100%',
      fill: { color: hex(accentColor) },
    });

    // Accent line above title (matching the accent bar color)
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(accentColor) },
    });

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '55%' : '85%';

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
      });
    }

    // Body — use rich body parser
    if (slide.body) {
      this.parseRichBody(s, slide.body, palette, theme, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        maxH: '52%',
        baseFontSize: 14,
      });
    }

    // Image on right
    if (hasImage) {
      this.addRightImage(s, slide);
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── Default CONTENT Slide ────────────────────────────────

  private addContentSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '58%' : '90%';

    // Accent line above title (Z4 style)
    s.addShape('rect', {
      x: 0.5,
      y: 0.25,
      w: 1.5,
      h: 0.04,
      fill: { color: hex(palette.primary) },
    });

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.text),
        bold: true,
        valign: 'top',
      });
    }

    // Body — use rich body parser
    if (slide.body) {
      this.parseRichBody(s, slide.body, palette, theme, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        maxH: '52%',
        baseFontSize: 14,
      });
    }

    // Image on right
    if (hasImage) {
      this.addRightImage(s, slide);
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── Shared Layout Helpers ────────────────────────────────

  /** Adds a subtle gradient overlay shape for depth */
  private addGradientOverlay(
    s: PptxGenJS.Slide,
    palette: ColorPalette,
  ): void {
    // Blend background toward surface for subtle depth — 8% mix
    const blended = darken(palette.surface, 0.92);
    s.addShape('rect', {
      x: 0,
      y: '85%',
      w: '100%',
      h: '15%',
      fill: { color: blended },
    });
  }

  /** Adds a right-side image (standard 35% layout) */
  private addRightImage(s: PptxGenJS.Slide, slide: SlideModel): void {
    if (!slide.imageUrl) return;
    try {
      s.addImage({
        data: slide.imageUrl,
        x: '63%',
        y: 0.3,
        w: '34%',
        h: '78%',
        rounding: true,
      });
    } catch {
      // Image load failed — slide still renders with text
    }
  }

  /** Adds a footer with slide number, branding, and accent line */
  private addFooter(
    s: PptxGenJS.Slide,
    slideNumber: number,
    totalSlides: number,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    // Thin accent line
    s.addShape('rect', {
      x: 0.5,
      y: '93%',
      w: '92%',
      h: 0.01,
      fill: { color: hex(palette.border) },
    });

    // Branding left
    s.addText('Pitchable', {
      x: 0.5,
      y: '94%',
      w: 2,
      h: 0.3,
      fontSize: 8,
      fontFace: theme.bodyFont,
      color: hex(palette.border),
    });

    // Slide number right
    s.addText(`${slideNumber} / ${totalSlides}`, {
      x: '80%',
      y: '94%',
      w: 2,
      h: 0.3,
      fontSize: 8,
      fontFace: theme.bodyFont,
      color: hex(palette.border),
      align: 'right',
    });
  }

  /** Fallback: render body text when image fails on ARCHITECTURE slides */
  private addBodyFallback(
    s: PptxGenJS.Slide,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    if (!slide.body) return;
    this.parseRichBody(s, slide.body, palette, theme, {
      x: 0.8,
      y: 1.2,
      w: '85%',
      maxH: '55%',
      baseFontSize: 14,
    });
  }

  // ── Rich Body Parser (master router) ─────────────────────
  //
  // Detects and routes different content blocks within body text:
  //   - Markdown tables (| ... |)      -> addTable()
  //   - H3 subheadings (### ...)       -> addH3Subheading()
  //   - Blockquotes (> ...)            -> addBlockquote()
  //   - Source citations (Sources: ...) -> addSourceCitation()
  //   - Everything else                -> parseBodyWithFormatting() -> s.addText()
  //
  // This method adds elements directly to the slide because tables need
  // s.addTable() while text needs s.addText().

  private parseRichBody(
    s: PptxGenJS.Slide,
    body: string,
    palette: ColorPalette,
    theme: ThemeModel,
    opts: {
      x: number | string;
      y: number | string;
      w: number | string;
      maxH: number | string;
      baseFontSize: number;
    },
  ): void {
    const lines = body.split('\n');
    let currentY = pctToInchesY(opts.y);
    const xPos = pctToInchesX(opts.x);
    const wPos = pctToInchesX(opts.w);
    const maxYLimit = pctToInchesY(opts.y) + pctToInchesY(opts.maxH);

    // Accumulator for plain text lines that will be batched into a single addText
    let plainBuffer: string[] = [];

    const flushPlainBuffer = (): void => {
      if (plainBuffer.length === 0) return;
      // Stop adding elements if we've hit the maxH boundary
      if (currentY >= maxYLimit) { plainBuffer = []; return; }

      const text = plainBuffer.join('\n');
      const elements = this.parseBodyWithFormatting(text, palette, theme, opts.baseFontSize);
      if (elements.length > 0) {
        // Height estimation: lineCount * (fontSize * lineSpacing / 72)
        // Using 2.2 multiplier to account for line spacing, paragraph spacing, and bullet indentation
        const lineCount = plainBuffer.filter((l) => l.trim()).length;
        let estimatedH = Math.max(0.3, lineCount * (opts.baseFontSize * 2.2 / 72));

        // Clamp height to not exceed maxH boundary
        if (currentY + estimatedH > maxYLimit) {
          estimatedH = Math.max(0.3, maxYLimit - currentY);
        }

        s.addText(elements, {
          x: xPos,
          y: currentY,
          w: wPos,
          h: estimatedH,
          fontSize: opts.baseFontSize,
          fontFace: theme.bodyFont,
          color: hex(palette.text),
          valign: 'top',
          paraSpaceAfter: 6,
        });
        currentY += estimatedH;
      }
      plainBuffer = [];
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // ── Markdown table detection ──
      if (this.isTableLine(trimmed)) {
        flushPlainBuffer();
        if (currentY >= maxYLimit) { i++; continue; }
        const tableLines: string[] = [];
        while (i < lines.length && this.isTableLine(lines[i].trim())) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const tableH = this.addTable(s, tableLines, palette, theme, currentY, wPos, xPos, maxYLimit);
        currentY = tableH;
        continue;
      }

      // ── Source citation ──
      if (/^sources?:/i.test(trimmed)) {
        flushPlainBuffer();
        // Source citation always renders at fixed position, no overflow check needed
        let sourceLine = trimmed;
        i++;
        while (i < lines.length && lines[i].trim() && !this.isTableLine(lines[i].trim()) && !/^###\s/.test(lines[i].trim()) && !/^>\s/.test(lines[i].trim())) {
          sourceLine += ' ' + lines[i].trim();
          i++;
        }
        this.addSourceCitation(s, sourceLine, palette, theme);
        continue;
      }

      // ── H3 subheading ──
      if (/^###\s+/.test(trimmed)) {
        flushPlainBuffer();
        if (currentY >= maxYLimit) { i++; continue; }
        const headingText = trimmed.replace(/^###\s+/, '');
        this.addH3Subheading(s, headingText, palette, theme, currentY, xPos, wPos);
        currentY += 0.4; // H3 takes roughly 0.4 inches
        i++;
        continue;
      }

      // ── Blockquote ──
      if (/^>\s+/.test(trimmed)) {
        flushPlainBuffer();
        if (currentY >= maxYLimit) { i++; continue; }
        const quoteLines: string[] = [];
        while (i < lines.length && /^>\s+/.test(lines[i].trim())) {
          quoteLines.push(lines[i].trim().replace(/^>\s+/, ''));
          i++;
        }
        const quoteH = this.addBlockquote(s, quoteLines, palette, theme, currentY, xPos, wPos, opts.baseFontSize);
        currentY = quoteH;
        continue;
      }

      // ── Plain text / bullet / other ──
      plainBuffer.push(line);
      i++;
    }

    // Flush any remaining plain text
    flushPlainBuffer();
  }

  // ── Table Detection & Rendering ───────────────────────────

  /** Check if a line is part of a markdown table */
  private isTableLine(line: string): boolean {
    return /^\|.+\|$/.test(line.trim());
  }

  /** Check if a line is the markdown table separator row (|---|---|) */
  private isTableSeparator(line: string): boolean {
    return /^\|[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|$/.test(line.trim());
  }

  /**
   * Parse markdown table lines and render as a PptxGenJS table.
   * Returns the new Y position after the table.
   */
  private addTable(
    s: PptxGenJS.Slide,
    tableLines: string[],
    palette: ColorPalette,
    theme: ThemeModel,
    yPos: number,
    width: number | string,
    xPos: number | string,
    maxYLimit?: number,
  ): number {
    if (tableLines.length === 0) return yPos;

    // Parse rows: split each line by | and trim
    const parseCells = (line: string): string[] => {
      return line
        .split('|')
        .slice(1, -1) // remove empty first/last from leading/trailing |
        .map((cell) => cell.trim());
    };

    // First row = headers
    const headerCells = parseCells(tableLines[0]);
    const colCount = headerCells.length;

    // Collect data rows (skip separator row)
    let dataRows: string[][] = [];
    for (let i = 1; i < tableLines.length; i++) {
      if (this.isTableSeparator(tableLines[i])) continue;
      const cells = parseCells(tableLines[i]);
      // Pad/trim to match column count
      while (cells.length < colCount) cells.push('');
      dataRows.push(cells.slice(0, colCount));
    }

    // Clamp data rows to fit within maxH boundary (header row = 1 + data rows)
    const rowHeight = 0.35;
    if (maxYLimit) {
      const availableH = maxYLimit - yPos;
      const maxRows = Math.max(1, Math.floor(availableH / rowHeight) - 1); // -1 for header
      if (dataRows.length > maxRows) {
        dataRows = dataRows.slice(0, maxRows);
      }
    }

    const wNum = typeof width === 'number' ? width : pctToInchesX(width);
    const xNum = typeof xPos === 'number' ? xPos : pctToInchesX(xPos);
    const colW = wNum / colCount;

    // Build PptxGenJS table rows
    type TableCell = { text: PptxGenJS.TextProps[]; options: Record<string, unknown> };
    const tableRows: TableCell[][] = [];

    // Header row — primary accent background with high-contrast text
    const headerRow: TableCell[] = headerCells.map((cell) => ({
      text: this.parseTableCellInline(cell, palette, theme, 12, true),
      options: {
        fill: { color: hex(palette.primary) },
        color: hex(palette.text),
        bold: true,
        fontSize: 12,
        fontFace: theme.bodyFont,
        border: { type: 'solid', color: hex(palette.border), pt: 0.5 },
        valign: 'middle' as const,
        margin: [4, 6, 4, 6],
      },
    }));
    tableRows.push(headerRow);

    // Data rows with alternating backgrounds
    dataRows.forEach((row, rowIdx) => {
      const bgColor = rowIdx % 2 === 0 ? palette.surface : palette.background;
      const dataRow: TableCell[] = row.map((cell) => ({
        text: this.parseTableCellInline(cell, palette, theme, 11, false),
        options: {
          fill: { color: hex(bgColor) },
          color: hex(palette.text),
          fontSize: 11,
          fontFace: theme.bodyFont,
          border: { type: 'solid', color: hex(palette.border), pt: 0.5 },
          valign: 'middle' as const,
          margin: [4, 6, 4, 6],
        },
      }));
      tableRows.push(dataRow);
    });

    // Calculate table height: header + data rows
    const tableHeight = rowHeight * tableRows.length;

    s.addTable(tableRows as PptxGenJS.TableRow[], {
      x: xNum,
      y: yPos,
      w: wNum,
      colW: Array(colCount).fill(colW),
      rowH: rowHeight,
      border: { type: 'solid', color: hex(palette.border), pt: 0.5 },
      autoPage: false,
    });

    return yPos + tableHeight + 0.15; // 0.15 inch gap after table
  }

  /**
   * Parse inline formatting within a table cell.
   * Handles **bold** with accent color.
   */
  private parseTableCellInline(
    text: string,
    palette: ColorPalette,
    theme: ThemeModel,
    fontSize: number,
    isHeader: boolean,
  ): PptxGenJS.TextProps[] {
    const elements: PptxGenJS.TextProps[] = [];
    const regex = /(\*\*(.+?)\*\*|([^*]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[2]) {
        // **bold** — accent color
        elements.push({
          text: match[2],
          options: {
            fontSize,
            fontFace: theme.bodyFont,
            color: hex(palette.accent),
            bold: true,
          },
        });
      } else if (match[3] && match[3].trim()) {
        elements.push({
          text: match[3],
          options: {
            fontSize,
            fontFace: theme.bodyFont,
            color: isHeader ? hex(palette.text) : hex(palette.text),
            bold: isHeader,
          },
        });
      }
    }

    if (elements.length === 0) {
      elements.push({
        text: text || ' ',
        options: {
          fontSize,
          fontFace: theme.bodyFont,
          color: isHeader ? hex(palette.text) : hex(palette.text),
          bold: isHeader,
        },
      });
    }

    return elements;
  }

  // ── Source Citation ────────────────────────────────────────

  /**
   * Render source citation as small gray text at the bottom of the slide.
   */
  private addSourceCitation(
    s: PptxGenJS.Slide,
    sourceLine: string,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    s.addText(sourceLine, {
      x: 0.5,
      y: '88%',
      w: '92%',
      h: 0.35,
      fontSize: 8,
      fontFace: theme.bodyFont,
      color: hex(palette.secondary),
      valign: 'top',
      italic: true,
    });
  }

  // ── H3 Subheading ─────────────────────────────────────────

  /**
   * Render an H3 subheading in accent color, bold, slightly larger font.
   */
  private addH3Subheading(
    s: PptxGenJS.Slide,
    text: string,
    palette: ColorPalette,
    theme: ThemeModel,
    yPos: number,
    xPos: number | string,
    width: number | string,
  ): void {
    const xNum = typeof xPos === 'number' ? xPos : pctToInchesX(xPos);
    const wNum = typeof width === 'number' ? width : pctToInchesX(width);

    s.addText(text, {
      x: xNum,
      y: yPos,
      w: wNum,
      h: 0.35,
      fontSize: 14,
      fontFace: theme.headingFont,
      color: hex(palette.accent),
      bold: true,
      valign: 'middle',
    });
  }

  // ── Blockquote ────────────────────────────────────────────

  /**
   * Render a blockquote with accent left bar and muted background.
   * Returns the new Y position after the blockquote.
   */
  private addBlockquote(
    s: PptxGenJS.Slide,
    quoteLines: string[],
    palette: ColorPalette,
    theme: ThemeModel,
    yPos: number,
    xPos: number | string,
    width: number | string,
    baseFontSize: number,
  ): number {
    const xNum = typeof xPos === 'number' ? xPos : pctToInchesX(xPos);
    const wNum = typeof width === 'number' ? width : pctToInchesX(width);

    const quoteText = quoteLines.join('\n');
    const lineCount = quoteLines.length;
    const quoteH = Math.max(0.4, lineCount * (baseFontSize * 1.8 / 72));

    // Muted background rectangle
    s.addShape('rect', {
      x: xNum,
      y: yPos,
      w: wNum,
      h: quoteH,
      fill: { color: darken(palette.surface, 0.3) },
      rectRadius: 0.05,
    });

    // Accent left border bar
    s.addShape('rect', {
      x: xNum,
      y: yPos,
      w: 0.05,
      h: quoteH,
      fill: { color: hex(palette.accent) },
    });

    // Quote text (italic, slightly smaller)
    s.addText(quoteText, {
      x: xNum + 0.15,
      y: yPos,
      w: wNum - 0.2,
      h: quoteH,
      fontSize: baseFontSize - 1,
      fontFace: theme.bodyFont,
      color: hex(palette.text),
      italic: true,
      valign: 'middle',
      paraSpaceAfter: 4,
    });

    return yPos + quoteH + 0.1; // gap after blockquote
  }

  // ── Body Parsers ─────────────────────────────────────────

  /**
   * Parse body text with inline markdown formatting (**bold**, *italic*).
   * Bold text gets accent color for emphasis.
   */
  private parseBodyWithFormatting(
    body: string,
    palette: ColorPalette,
    theme: ThemeModel,
    baseFontSize: number,
  ): PptxGenJS.TextProps[] {
    const lines = body.split('\n');
    const elements: PptxGenJS.TextProps[] = [];

    for (const line of lines) {
      // Nested bullet
      const nestedBullet = line.match(/^(?:\s{2,}|\t)[-*]\s+(.+)/);
      if (nestedBullet) {
        elements.push({
          text: nestedBullet[1],
          options: {
            bullet: true,
            indentLevel: 1,
            fontSize: baseFontSize - 2,
            fontFace: theme.bodyFont,
            color: hex(palette.text),
          },
        });
        continue;
      }

      // Top-level bullet
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      if (bullet) {
        const inlineElements = this.parseInlineFormatting(
          bullet[1],
          palette,
          theme,
          baseFontSize,
        );
        // First element gets bullet marker
        if (inlineElements.length > 0) {
          inlineElements[0].options = {
            ...inlineElements[0].options,
            bullet: true,
            indentLevel: 0,
          };
        }
        elements.push(...inlineElements);
        continue;
      }

      // Plain text line
      if (line.trim()) {
        const inlineElements = this.parseInlineFormatting(
          line.trim(),
          palette,
          theme,
          baseFontSize,
        );
        elements.push(...inlineElements);
      }
    }

    return elements;
  }

  /**
   * Parse inline **bold** and *italic* markdown within a single line.
   * Bold text renders in accent color for visual emphasis.
   */
  private parseInlineFormatting(
    text: string,
    palette: ColorPalette,
    theme: ThemeModel,
    baseFontSize: number,
  ): PptxGenJS.TextProps[] {
    const elements: PptxGenJS.TextProps[] = [];
    // Match **bold**, *italic*, or regular text segments
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[2]) {
        // **bold** — accent colored
        elements.push({
          text: match[2],
          options: {
            fontSize: baseFontSize,
            fontFace: theme.bodyFont,
            color: hex(palette.accent),
            bold: true,
          },
        });
      } else if (match[3]) {
        // *italic*
        elements.push({
          text: match[3],
          options: {
            fontSize: baseFontSize,
            fontFace: theme.bodyFont,
            color: hex(palette.text),
            italic: true,
          },
        });
      } else if (match[4]) {
        // regular text
        const segment = match[4];
        if (segment.trim()) {
          elements.push({
            text: segment,
            options: {
              fontSize: baseFontSize,
              fontFace: theme.bodyFont,
              color: hex(palette.text),
            },
          });
        }
      }
    }

    // If no matches, return original text
    if (elements.length === 0 && text.trim()) {
      elements.push({
        text: text + '\n',
        options: {
          fontSize: baseFontSize,
          fontFace: theme.bodyFont,
          color: hex(palette.text),
        },
      });
    }

    return elements;
  }

  /**
   * DATA_METRICS body parser: numbers/percentages/currency get accent color + bold.
   */
  private parseDataMetricsBody(
    body: string,
    palette: ColorPalette,
    theme: ThemeModel,
  ): PptxGenJS.TextProps[] {
    const lines = body.split('\n');
    const elements: PptxGenJS.TextProps[] = [];

    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      const content = bullet ? bullet[1] : line.trim();
      if (!content) continue;

      // Split on numeric patterns: $X, X%, Xk, Xm, Xb, Xx
      const parts = content.split(/(\$[\d,.]+[BMKbmk]?|\d+[.,]?\d*[%xXBMKbmk]+|\d+[.,]\d+)/);
      const lineElements: PptxGenJS.TextProps[] = [];

      for (const part of parts) {
        if (!part) continue;
        const isNumber = /^(\$[\d,.]+[BMKbmk]?|\d+[.,]?\d*[%xXBMKbmk]+|\d+[.,]\d+)$/.test(part);

        lineElements.push({
          text: part,
          options: {
            fontSize: 16,
            fontFace: theme.bodyFont,
            color: isNumber ? hex(palette.accent) : hex(palette.text),
            bold: isNumber,
          },
        });
      }

      // Add bullet to first element
      if (bullet && lineElements.length > 0) {
        lineElements[0].options = {
          ...lineElements[0].options,
          bullet: true,
          indentLevel: 0,
        };
      }

      elements.push(...lineElements);
    }

    return elements;
  }

  /**
   * PROCESS body parser: numbered steps with accent-colored step numbers.
   */
  private parseProcessBody(
    body: string,
    palette: ColorPalette,
    theme: ThemeModel,
  ): PptxGenJS.TextProps[] {
    const lines = body.split('\n').filter((l) => l.trim());
    const elements: PptxGenJS.TextProps[] = [];
    let stepCounter = 1;

    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
      const content = numbered ? numbered[2] : bullet ? bullet[1] : line.trim();

      if (!content) continue;

      // Step number in accent color
      elements.push({
        text: `${stepCounter}. `,
        options: {
          fontSize: 16,
          fontFace: theme.headingFont,
          color: hex(palette.accent),
          bold: true,
        },
      });

      // Step content
      elements.push({
        text: content,
        options: {
          fontSize: 16,
          fontFace: theme.bodyFont,
          color: hex(palette.text),
        },
      });

      stepCounter++;
    }

    return elements;
  }
}
