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

  // ── TITLE Slide ──────────────────────────────────────────

  private addTitleSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_ACCENT' });

    // Subtle gradient overlay
    this.addGradientOverlay(s, palette);

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

    // Title — large, centered
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.8,
        y: '30%',
        w: '85%',
        h: 1.2,
        fontSize: 42,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Subtitle from body — muted, centered below title
    if (slide.body) {
      const subtitle = slide.body
        .split('\n')
        .filter((l) => l.trim())
        .slice(0, 3)
        .map((l) => l.replace(/^[-*]\s+/, '').trim())
        .join(' \u00b7 ');

      s.addText(subtitle, {
        x: 1.2,
        y: '55%',
        w: '78%',
        h: 0.8,
        fontSize: 18,
        fontFace: theme.bodyFont,
        color: hex(palette.secondary),
        align: 'center',
        valign: 'top',
      });
    }

    // Accent line below subtitle
    s.addShape('rect', {
      x: '35%',
      y: '72%',
      w: '30%',
      h: 0.03,
      fill: { color: hex(palette.accent) },
    });

    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── CTA Slide ────────────────────────────────────────────

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

    // Title — large accent color, centered
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.8,
        y: '25%',
        w: '85%',
        h: 1.2,
        fontSize: 36,
        fontFace: theme.headingFont,
        color: hex(palette.accent),
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // Body — centered below
    if (slide.body) {
      const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 18);
      s.addText(elements, {
        x: 1.2,
        y: '50%',
        w: '78%',
        h: '35%',
        fontSize: 18,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        align: 'center',
        valign: 'top',
        paraSpaceAfter: 8,
      });
    }

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

    // Gold left border accent
    s.addShape('rect', {
      x: 0.6,
      y: '15%',
      w: 0.06,
      h: '60%',
      fill: { color: hex(palette.accent) },
    });

    // Large opening quote mark
    s.addText('\u201c', {
      x: 0.9,
      y: '12%',
      w: 0.8,
      h: 0.8,
      fontSize: 72,
      fontFace: theme.headingFont,
      color: hex(palette.accent),
      transparency: 40,
    });

    // Title as quote heading
    if (slide.title) {
      s.addText(slide.title, {
        x: 1.0,
        y: '18%',
        w: '78%',
        h: 0.6,
        fontSize: 24,
        fontFace: theme.headingFont,
        color: hex(palette.accent),
        bold: true,
        italic: true,
      });
    }

    // Body as quote text — centered, larger
    if (slide.body) {
      const lines = slide.body.split('\n').filter((l) => l.trim());
      const quoteText = lines.map((l) => l.replace(/^[-*]\s+/, '').trim()).join('\n');

      s.addText(quoteText, {
        x: 1.0,
        y: '32%',
        w: '78%',
        h: '40%',
        fontSize: 18,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        italic: true,
        valign: 'top',
        paraSpaceBefore: 4,
        paraSpaceAfter: 4,
      });
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

    // Centered title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: '92%',
        h: 0.7,
        fontSize: 26,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
        align: 'center',
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

      // Compact body below image (if space)
      if (slide.body) {
        const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 12);
        s.addText(elements, {
          x: 0.5,
          y: '82%',
          w: '92%',
          h: '12%',
          fontSize: 12,
          fontFace: theme.bodyFont,
          color: hex(palette.secondary),
          valign: 'top',
          paraSpaceAfter: 2,
        });
      }
    } else {
      // No image — body fills the space, centered
      if (slide.body) {
        const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 16);
        s.addText(elements, {
          x: 0.8,
          y: 1.2,
          w: '85%',
          h: '68%',
          fontSize: 16,
          fontFace: theme.bodyFont,
          color: hex(palette.text),
          align: 'center',
          valign: 'top',
          paraSpaceAfter: 6,
        });
      }
    }

    this.addFooter(s, slide.slideNumber, totalSlides, palette, theme);
    if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
  }

  // ── COMPARISON Slide ─────────────────────────────────────

  private addComparisonSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
    totalSlides: number,
  ): void {
    const s = pres.addSlide({ masterName: 'PITCHABLE_DARK' });

    this.addGradientOverlay(s, palette);

    // Centered title spanning full width
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: '92%',
        h: 0.7,
        fontSize: 26,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
        align: 'center',
      });
    }

    // Split body into two columns
    const bodyLines = (slide.body ?? '').split('\n').filter((l) => l.trim());
    const midpoint = Math.ceil(bodyLines.length / 2);
    const leftLines = bodyLines.slice(0, midpoint);
    const rightLines = bodyLines.slice(midpoint);

    // Left column
    const leftElements = this.parseBodyWithFormatting(leftLines.join('\n'), palette, theme, 14);
    s.addText(leftElements, {
      x: 0.5,
      y: 1.3,
      w: '44%',
      h: '58%',
      fontSize: 14,
      fontFace: theme.bodyFont,
      color: hex(palette.text),
      valign: 'top',
      paraSpaceAfter: 4,
    });

    // Vertical divider line
    s.addShape('rect', {
      x: '49.5%',
      y: 1.3,
      w: 0.02,
      h: '55%',
      fill: { color: hex(palette.border) },
    });

    // Right column
    const rightElements = this.parseBodyWithFormatting(rightLines.join('\n'), palette, theme, 14);
    s.addText(rightElements, {
      x: '52%',
      y: 1.3,
      w: '44%',
      h: '58%',
      fontSize: 14,
      fontFace: theme.bodyFont,
      color: hex(palette.text),
      valign: 'top',
      paraSpaceAfter: 4,
    });

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

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
      });
    }

    // Body with number highlighting
    if (slide.body) {
      const elements = this.parseDataMetricsBody(slide.body, palette, theme);
      s.addText(elements, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        h: '62%',
        fontSize: 16,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        valign: 'top',
        paraSpaceAfter: 6,
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

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
      });
    }

    // Body as numbered steps with accent-colored step numbers
    if (slide.body) {
      const elements = this.parseProcessBody(slide.body, palette, theme);
      s.addText(elements, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        h: '62%',
        fontSize: 16,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        valign: 'top',
        paraSpaceAfter: 8,
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

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '55%' : '85%';

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
      });
    }

    // Body
    if (slide.body) {
      const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 16);
      s.addText(elements, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        h: '62%',
        fontSize: 16,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        valign: 'top',
        paraSpaceAfter: 6,
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

    // Title
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: contentWidth,
        h: 0.7,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
        valign: 'top',
      });
    }

    // Body
    if (slide.body) {
      const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 16);
      s.addText(elements, {
        x: 0.5,
        y: 1.2,
        w: contentWidth,
        h: '62%',
        fontSize: 16,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        valign: 'top',
        paraSpaceAfter: 6,
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
    const elements = this.parseBodyWithFormatting(slide.body, palette, theme, 16);
    s.addText(elements, {
      x: 0.8,
      y: 1.2,
      w: '85%',
      h: '68%',
      fontSize: 16,
      fontFace: theme.bodyFont,
      color: hex(palette.text),
      valign: 'top',
      paraSpaceAfter: 6,
    });
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
    let isFirst = true;

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
      isFirst = false;
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
      let isFirst = true;

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
        isFirst = false;
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
