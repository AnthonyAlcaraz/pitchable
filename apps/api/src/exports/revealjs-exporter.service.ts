import { Injectable } from '@nestjs/common';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';

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
export class RevealJsExporterService {
  generateRevealHtml(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;
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
      --r-heading-font: '${theme.headingFont}', sans-serif;
      --r-main-font: '${theme.bodyFont}', sans-serif;
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
    const lines: string[] = [];

    lines.push(
      `      <section data-background-color="${palette.background}">`,
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
      lines.push(`          <div>${this.convertBodyToHtml(slide.body)}</div>`);
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
    let html = this.escapeHtml(body);

    // Convert markdown-style bullets to HTML lists
    const lines = html.split('\n');
    const result: string[] = [];
    let inList = false;

    for (const line of lines) {
      const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)/);
      if (bulletMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${bulletMatch[1]}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        if (line.trim()) {
          result.push(`<p>${line}</p>`);
        }
      }
    }

    if (inList) {
      result.push('</ul>');
    }

    return result.join('\n');
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
