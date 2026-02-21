import { Injectable } from '@nestjs/common';
import { marked } from 'marked';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';
import {
  getSlideBackground,
  generateRevealBackgroundCSS,
  generateRevealAccentRotationCSS,
  generateRevealMcKinseyCSS,
} from './slide-visual-theme.js';

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

function darkenHex(color: string, amount: number): string {
  const c = color.replace('#', '');
  const r = Math.max(0, Math.floor(parseInt(c.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(c.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(c.slice(4, 6), 16) * (1 - amount)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function lightenHex(color: string, amount: number): string {
  const c = color.replace('#', '');
  const r = Math.min(255, Math.floor(parseInt(c.slice(0, 2), 16) + (255 - parseInt(c.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.floor(parseInt(c.slice(2, 4), 16) + (255 - parseInt(c.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.floor(parseInt(c.slice(4, 6), 16) + (255 - parseInt(c.slice(4, 6), 16)) * amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function isDarkBg(bg: string): boolean {
  const c = bg.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

@Injectable()
export class RevealJsExporterService {
  generateRevealHtml(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;
    const bg = palette.background;
    const gradientEnd = isDarkBg(bg) ? darkenHex(bg, 0.15) : lightenHex(bg, 0.05);
    const isMcKinsey = theme.name === 'mckinsey-executive';
    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    const slideSections = sortedSlides
      .map((slide) => this.buildSlideSection(slide, palette))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(presentation.title)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/theme/black.min.css">
  <style>
    :root {
      --r-background-color: ${palette.background};
      --r-main-color: ${palette.text};
      --r-heading-color: ${palette.primary};
      --r-link-color: ${palette.accent};
      --r-link-color-hover: ${palette.secondary};
      --r-heading-font: ${isMcKinsey ? "'Georgia', serif" : `'${theme.headingFont}', sans-serif`};
      --r-main-font: ${isMcKinsey ? "'Arial', sans-serif" : `'${theme.bodyFont}', sans-serif`};
    }
    .reveal {
      font-family: var(--r-main-font);
      color: var(--r-main-color);
    }
    .reveal .slides section {
      text-align: left;
    }
    .reveal h1, .reveal h2, .reveal h3 {
      font-family: var(--r-heading-font);
      color: var(--r-heading-color);
      text-transform: none;
    }
    .reveal blockquote {
      border-left: 4px solid ${palette.accent};
      padding-left: 1em;
      color: ${palette.secondary};
      font-style: italic;
      background: ${palette.surface};
      width: 90%;
    }
    .reveal table {
      width: 100%;
      border-collapse: collapse;
    }
    .reveal th {
      background-color: ${palette.surface};
      color: ${palette.primary};
      border-bottom: 2px solid ${palette.border};
      padding: 0.5em;
    }
    .reveal td {
      border-bottom: 1px solid ${palette.border};
      padding: 0.5em;
    }
    .reveal ul, .reveal ol {
      display: block;
      margin-left: 1em;
    }
    .slide-bg-image {
      position: absolute;
      right: 0;
      top: 0;
      width: 35%;
      height: 100%;
      object-fit: cover;
      opacity: 0.7;
    }
    .slide-content-with-image {
      width: 60%;
    }
    /* Per-slide background variants */
${isMcKinsey ? generateRevealMcKinseyCSS(palette) : generateRevealBackgroundCSS(palette, bg, gradientEnd)}
    /* Accent color rotation on bold text */
${isMcKinsey ? '' : generateRevealAccentRotationCSS(palette.accent, palette.primary, palette.success, palette.secondary)}
    /* New slide types */
    .showcase { max-width: 55%; }
    .showcase strong { font-size: 1.3em; display: block; margin-bottom: 8px; }
    .showcase span { font-size: 0.85em; opacity: 0.85; display: block; }
    .logo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
    .logo-badge { background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: 10px; padding: 14px 16px; text-align: center; font-size: 0.8em; font-weight: 600; }
    .market-sizing { display: flex; align-items: center; justify-content: center; position: relative; min-height: 340px; margin-top: 12px; }
    .market-ring { border: 2px solid ${palette.accent}; border-radius: 50%; display: flex; position: absolute; }
    .market-ring.tam { width: 320px; height: 320px; opacity: 0.4; align-items: flex-start; justify-content: center; padding-top: 16px; }
    .market-ring.sam { width: 220px; height: 220px; opacity: 0.6; align-items: flex-end; justify-content: center; padding-bottom: 12px; }
    .market-ring.som { width: 120px; height: 120px; opacity: 1.0; background: rgba(56,189,248,0.10); align-items: center; justify-content: center; }
    .ring-label { text-align: center; font-size: 0.55em; line-height: 1.2; }
    .ring-label strong { font-size: 1.5em; display: block; color: ${palette.accent}; }
    .ring-label span { opacity: 0.7; font-size: 0.9em; }
    .split-statement { display: grid; grid-template-columns: 30% 1fr; gap: 32px; align-items: center; min-height: 250px; }
    .statement { font-size: 1.5em; font-weight: 800; line-height: 1.15; }
    .evidence { font-size: 0.8em; }
    .evidence strong { display: block; font-size: 1.05em; margin-bottom: 2px; margin-top: 12px; }
    .evidence hr { border: none; border-top: 1px solid ${palette.border}; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
${slideSections}
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      transition: 'slide',
      backgroundTransition: 'fade',
    });
  </script>
</body>
</html>`;
  }

  private buildSlideSection(slide: SlideModel, palette: ColorPalette): string {
    const hasImage = !!slide.imageUrl;
    const contentClass = hasImage ? ' class="slide-content-with-image"' : '';
    const bgVariant = getSlideBackground(slide.slideType, slide.slideNumber, palette.background);
    const lines: string[] = [];

    lines.push(
      `      <section data-background-color="${palette.background}" class="${bgVariant.className}">`,
    );

    if (hasImage) {
      lines.push(
        `        <img class="slide-bg-image" src="${this.escapeHtml(slide.imageUrl!)}" alt="">`,
      );
    }

    lines.push(`        <div${contentClass}>`);

    if (slide.title) {
      lines.push(
        `          <h2>${this.escapeHtml(slide.title)}</h2>`,
      );
    }

    if (slide.body) {
      // HTML-structured slide types pass through raw (they contain <div> layouts)
      const htmlStructuredTypes = ['TEAM', 'FEATURE_GRID', 'METRICS_HIGHLIGHT', 'PRODUCT_SHOWCASE', 'LOGO_WALL', 'MARKET_SIZING', 'SPLIT_STATEMENT'];
      if (htmlStructuredTypes.includes(slide.slideType)) {
        lines.push(`          <div>${slide.body}</div>`);
      } else {
        lines.push(`          <div>${this.convertBodyToHtml(slide.body)}</div>`);
      }
    }

    lines.push('        </div>');

    if (slide.speakerNotes) {
      lines.push('        <aside class="notes">');
      lines.push(`          ${this.escapeHtml(slide.speakerNotes)}`);
      lines.push('        </aside>');
    }

    lines.push('      </section>');

    return lines.join('\n');
  }

  private convertBodyToHtml(body: string): string {
    return marked.parse(body, { async: false }) as string;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
