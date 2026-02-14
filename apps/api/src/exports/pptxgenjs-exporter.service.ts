import { Injectable, Logger } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';
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

/** Strip '#' prefix for PptxGenJS hex colors */
function hex(color: string): string {
  return color.replace(/^#/, '');
}

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
    pres.layout = 'LAYOUT_WIDE'; // 16:9

    // Define slide master with theme
    pres.defineSlideMaster({
      title: 'PITCHABLE_MASTER',
      background: { color: hex(palette.background) },
    });

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    for (const slide of sortedSlides) {
      this.addSlide(pres, slide, palette, theme);
    }

    const output = await pres.write({ outputType: 'nodebuffer' });
    this.logger.log(
      `PPTX generated: "${presentation.title}" (${sortedSlides.length} slides)`,
    );
    return output as Buffer;
  }

  private addSlide(
    pres: PptxGenJS,
    slide: SlideModel,
    palette: ColorPalette,
    theme: ThemeModel,
  ): void {
    const pptxSlide = pres.addSlide({ masterName: 'PITCHABLE_MASTER' });

    const hasImage = !!slide.imageUrl;
    const contentWidth = hasImage ? '58%' : '90%';

    // Title
    if (slide.title) {
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: contentWidth,
        h: 0.8,
        fontSize: 28,
        fontFace: theme.headingFont,
        color: hex(palette.primary),
        bold: true,
        valign: 'top',
      });
    }

    // Body
    if (slide.body) {
      const elements = this.parseBodyToPptxElements(slide.body, palette, theme);
      pptxSlide.addText(elements, {
        x: 0.5,
        y: 1.3,
        w: contentWidth,
        h: '65%',
        fontSize: 16,
        fontFace: theme.bodyFont,
        color: hex(palette.text),
        valign: 'top',
        paraSpaceAfter: 6,
      });
    }

    // Image (positioned on right side)
    if (slide.imageUrl) {
      try {
        pptxSlide.addImage({
          path: slide.imageUrl,
          x: '63%',
          y: 0.3,
          w: '33%',
          h: '85%',
        });
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to add image for slide ${slide.slideNumber}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // Speaker notes
    if (slide.speakerNotes) {
      pptxSlide.addNotes(slide.speakerNotes);
    }
  }

  private parseBodyToPptxElements(
    body: string,
    palette: ColorPalette,
    theme: ThemeModel,
  ): PptxGenJS.TextProps[] {
    const lines = body.split('\n');
    const elements: PptxGenJS.TextProps[] = [];

    for (const line of lines) {
      // Nested bullet: 2+ spaces or tab before bullet marker
      const nestedBullet = line.match(/^(?:\s{2,}|\t)[-*]\s+(.+)/);
      if (nestedBullet) {
        elements.push({
          text: nestedBullet[1],
          options: {
            bullet: true,
            indentLevel: 1,
            fontSize: 14,
            fontFace: theme.bodyFont,
            color: hex(palette.text),
          },
        });
        continue;
      }

      // Top-level bullet
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      if (bullet) {
        elements.push({
          text: bullet[1],
          options: {
            bullet: true,
            indentLevel: 0,
            fontSize: 16,
            fontFace: theme.bodyFont,
            color: hex(palette.text),
          },
        });
        continue;
      }

      // Plain text line
      if (line.trim()) {
        elements.push({
          text: line.trim() + '\n',
          options: {
            fontSize: 16,
            fontFace: theme.bodyFont,
            color: hex(palette.text),
          },
        });
      }
    }

    return elements;
  }
}
