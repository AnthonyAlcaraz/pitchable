import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';
import PptxGenJS from 'pptxgenjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { FigmaService } from './figma.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';

interface RenderOptions {
  format: 'pdf' | 'pptx';
  templateId: string;
  lensId?: string;
}

interface SlideRecord {
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string | null;
  slideType: string;
}

@Injectable()
export class FigmaRendererService {
  private readonly logger = new Logger(FigmaRendererService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figmaService: FigmaService,
    private readonly s3: S3Service,
  ) {}

  async renderPresentation(
    presentationId: string,
    userId: string,
    options: RenderOptions,
  ): Promise<Buffer> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { theme: true },
    });
    if (!presentation) {
      throw new NotFoundException(`Presentation ${presentationId} not found`);
    }

    const slides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
    });

    const template = await this.prisma.figmaTemplate.findUnique({
      where: { id: options.templateId },
      include: { mappings: true },
    });
    if (!template) {
      throw new NotFoundException(`Template ${options.templateId} not found`);
    }

    // Map slideType → nodeId
    const typeToNodeId = new Map(
      template.mappings.map((m) => [m.slideType, m.figmaNodeId]),
    );

    const token = await this.figmaService.resolveToken(userId, options.lensId);
    if (!token) {
      throw new NotFoundException('No Figma access token found.');
    }

    // Batch export unique nodeIds
    const neededNodeIds = new Set<string>();
    for (const slide of slides) {
      const nodeId = typeToNodeId.get(slide.slideType);
      if (nodeId) neededNodeIds.add(nodeId);
    }

    const frameImages = new Map<string, Buffer>();
    if (neededNodeIds.size > 0) {
      const nodeIdString = Array.from(neededNodeIds).join(',');
      const imageUrls = await this.figmaService.exportNodesAsImage(
        token,
        template.figmaFileKey,
        nodeIdString,
        'png',
        2,
      );

      for (const [nodeId, url] of Object.entries(imageUrls)) {
        if (!url) continue;
        try {
          const res = await fetch(url);
          if (res.ok) {
            frameImages.set(nodeId, Buffer.from(await res.arrayBuffer()));
          }
        } catch (err) {
          this.logger.warn(`Failed to download frame ${nodeId}: ${err}`);
        }
      }
    }

    this.logger.log(
      `Exported ${frameImages.size} template frames for ${slides.length} slides`,
    );

    // Build slide→image mapping
    const slideImageMap = new Map<number, Buffer>();
    for (const slide of slides) {
      const nodeId = typeToNodeId.get(slide.slideType);
      if (nodeId) {
        const buf = frameImages.get(nodeId);
        if (buf) slideImageMap.set(slide.slideNumber, buf);
      }
    }

    if (options.format === 'pdf') {
      return this.assemblePdf(slides, slideImageMap);
    }

    return this.assemblePptx(slides, slideImageMap);
  }

  private async assemblePdf(
    slides: SlideRecord[],
    slideImages: Map<number, Buffer>,
  ): Promise<Buffer> {
    const pdf = await PDFDocument.create();

    for (const slide of slides) {
      const page = pdf.addPage([1920, 1080]);
      const imgBuf = slideImages.get(slide.slideNumber);

      if (imgBuf) {
        const pngImage = await pdf.embedPng(imgBuf);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        });
      } else {
        // White fallback
        page.drawRectangle({
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          color: rgb(1, 1, 1),
        });
      }
    }

    return Buffer.from(await pdf.save());
  }

  private async assemblePptx(
    slides: SlideRecord[],
    slideImages: Map<number, Buffer>,
  ): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';

    for (const slide of slides) {
      const pptxSlide = pptx.addSlide();
      const imgBuf = slideImages.get(slide.slideNumber);

      // Full-bleed background image from Figma template
      if (imgBuf) {
        const base64 = imgBuf.toString('base64');
        pptxSlide.addImage({
          data: `image/png;base64,${base64}`,
          x: 0,
          y: 0,
          w: 13.33,
          h: 7.5,
        });
      }

      // Title overlay
      pptxSlide.addText(slide.title, {
        x: 0.8,
        y: 0.6,
        w: 8,
        h: 1.2,
        fontSize: 32,
        fontFace: 'Arial',
        bold: true,
        color: '333333',
      });

      // Body text overlay
      if (slide.body) {
        const bodyLines = slide.body
          .split('\n')
          .map((line) => line.replace(/^[-*]\s+/, '').trim())
          .filter(Boolean);

        if (bodyLines.length > 0) {
          pptxSlide.addText(
            bodyLines.map((line) => ({
              text: line,
              options: { bullet: true, fontSize: 18, color: '555555' },
            })),
            {
              x: 0.8,
              y: 2.0,
              w: 8,
              h: 4.5,
              fontFace: 'Arial',
              valign: 'top',
            },
          );
        }
      }

      if (slide.speakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }
    }

    const arrayBuffer = (await pptx.write({
      outputType: 'arraybuffer',
    })) as ArrayBuffer;
    return Buffer.from(arrayBuffer);
  }
}
