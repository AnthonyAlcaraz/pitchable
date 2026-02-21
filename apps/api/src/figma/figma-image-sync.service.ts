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

    let imageUrl: string | undefined;
    try {
      const { buffer, mimeType } = await this.figma.exportNodeAsBuffer(
        token,
        fileKey,
        nodeId,
        'png',
        2,
      );

      // 3. Upload to R2/S3
      const extension = mimeType.includes('svg') ? 'svg' : 'png';
      const s3Key = `images/figma/${slideId}.${extension}`;
      await this.s3.upload(s3Key, buffer, mimeType);
      imageUrl = this.s3.getPublicUrl(s3Key);
      this.logger.log(`Figma image uploaded to R2: ${imageUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('Rate limit')) {
        this.logger.warn(
          `Figma rate-limited during image export for slide ${slideId} — saving metadata only, image can be refreshed later`,
        );
      } else {
        throw err;
      }
    }

    // 4. Update Slide with Figma metadata (even if image export failed)
    const updateData: Record<string, unknown> = {
      imageSource: ImageSource.FIGMA,
      figmaFileKey: fileKey,
      figmaNodeId: nodeId,
    };
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const slide = await this.prisma.slide.update({
      where: { id: slideId },
      data: updateData,
      select: { presentationId: true },
    });

    // 5. Emit WebSocket event if image was successfully exported
    if (imageUrl) {
      this.events.emitImageGenerated({
        presentationId: slide.presentationId,
        slideId,
        imageUrl,
      });
    }

    this.logger.log(
      `Figma frame "${nodeId}" assigned to slide ${slideId}${imageUrl ? ' (with image)' : ' (metadata only — refresh later)'}`,
    );

    return imageUrl ?? `figma://${fileKey}/${nodeId}`;
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
