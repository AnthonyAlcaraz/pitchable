import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { FigmaService } from './figma.service.js';
import { ImageSource } from '../../generated/prisma/enums.js';

@Injectable()
export class FigmaImageSyncService {
  private readonly logger = new Logger(FigmaImageSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figma: FigmaService,
    private readonly s3: S3Service,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Export a Figma frame as PNG, upload to S3, and set Slide.imageUrl.
   * Reuses the existing WebSocket event so the frontend updates in real-time.
   */
  async syncFigmaFrameToSlide(
    slideId: string,
    userId: string,
    fileKey: string,
    nodeId: string,
    lensId?: string | null,
  ): Promise<string> {
    // 1. Resolve token (PitchLens → user-level fallback)
    const token = await this.figma.resolveToken(userId, lensId);
    if (!token) {
      throw new NotFoundException(
        'No Figma access token found. Connect Figma in your Pitch Lens or account settings.',
      );
    }

    // 2. Export frame as PNG @2x from Figma API
    this.logger.log(
      `Exporting Figma node ${nodeId} from file ${fileKey} for slide ${slideId}`,
    );
    const { buffer, mimeType } = await this.figma.exportNodeAsBuffer(
      token,
      fileKey,
      nodeId,
      'png',
      2,
    );

    // 3. Upload to S3
    const extension = mimeType.includes('svg') ? 'svg' : 'png';
    const s3Key = `images/figma/${slideId}.${extension}`;
    await this.s3.upload(s3Key, buffer, mimeType);

    // Build the direct S3 URL (same pattern as image-generation.processor.ts)
    const bucket = 'pitchable-documents';
    const s3Endpoint =
      process.env['S3_ENDPOINT'] || 'http://localhost:9000';
    const imageUrl = `${s3Endpoint}/${bucket}/${s3Key}`;

    this.logger.log(`Figma image uploaded to S3: ${imageUrl}`);

    // 4. Fetch node name for reference
    let nodeName: string | undefined;
    try {
      const frames = await this.figma.getFrames(token, fileKey);
      nodeName = frames.find((f) => f.nodeId === nodeId)?.name;
    } catch {
      // Non-critical — just for display
    }

    // 5. Update Slide with Figma metadata
    const slide = await this.prisma.slide.update({
      where: { id: slideId },
      data: {
        imageUrl,
        imageSource: ImageSource.FIGMA,
        figmaFileKey: fileKey,
        figmaNodeId: nodeId,
        figmaNodeName: nodeName ?? null,
      },
      select: { presentationId: true },
    });

    // 6. Emit WebSocket event (reuses existing event — frontend already handles it)
    this.events.emitImageGenerated({
      presentationId: slide.presentationId,
      slideId,
      imageUrl,
    });

    this.logger.log(
      `Figma frame "${nodeName ?? nodeId}" synced to slide ${slideId}`,
    );

    return imageUrl;
  }

  /**
   * Re-export a Figma frame using stored metadata.
   * Useful when the designer updates the graphic in Figma.
   */
  async refreshFigmaImage(
    slideId: string,
    userId: string,
    lensId?: string | null,
  ): Promise<string> {
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      select: {
        figmaFileKey: true,
        figmaNodeId: true,
        imageSource: true,
      },
    });

    if (!slide) {
      throw new NotFoundException(`Slide ${slideId} not found`);
    }

    if (
      slide.imageSource !== ImageSource.FIGMA ||
      !slide.figmaFileKey ||
      !slide.figmaNodeId
    ) {
      throw new NotFoundException(
        `Slide ${slideId} is not linked to a Figma frame`,
      );
    }

    return this.syncFigmaFrameToSlide(
      slideId,
      userId,
      slide.figmaFileKey,
      slide.figmaNodeId,
      lensId,
    );
  }
}
