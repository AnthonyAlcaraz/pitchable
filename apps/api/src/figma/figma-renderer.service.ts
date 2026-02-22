import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FigmaService } from './figma.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';

@Injectable()
export class FigmaRendererService {
  private readonly logger = new Logger(FigmaRendererService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figmaService: FigmaService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Fetch Figma template frame images for each slide, without assembling PPTX/PDF.
   * Returns Map<slideNumber, Buffer> of PNG images to use as Marp backgrounds.
   */
  async fetchSlideBackgrounds(
    presentationId: string,
    userId: string,
    templateId: string,
    lensId?: string,
  ): Promise<Map<number, Buffer>> {
    const slides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
    });

    const template = await this.prisma.figmaTemplate.findUnique({
      where: { id: templateId },
      include: { mappings: true },
    });
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const typeToNodeId = new Map(
      template.mappings.map((m) => [m.slideType, m.figmaNodeId]),
    );

    const token = await this.figmaService.resolveToken(userId, lensId);
    if (!token) {
      throw new NotFoundException('No Figma access token found.');
    }

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
      `Exported ${frameImages.size} template frames for ${slides.length} slides (backgrounds)`,
    );

    const slideImageMap = new Map<number, Buffer>();
    for (const slide of slides) {
      const nodeId = typeToNodeId.get(slide.slideType);
      if (nodeId) {
        const buf = frameImages.get(nodeId);
        if (buf) slideImageMap.set(slide.slideNumber, buf);
      }
    }

    return slideImageMap;
  }
}
