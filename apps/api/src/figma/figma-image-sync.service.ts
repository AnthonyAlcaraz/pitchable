import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { FigmaService } from './figma.service.js';
import { ImageSource } from '../../generated/prisma/enums.js';

/** Assignment of a Figma frame to a slide for batch export. */
export interface FigmaBatchItem {
  slideId: string;
  nodeId: string;
  nodeName?: string;
}

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
    nodeName?: string,
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
    if (nodeName) {
      updateData.figmaNodeName = nodeName;
    }
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
   * Batch export multiple Figma frames in ONE API call, then download + upload in parallel.
   *
   * Figma API: exportNodesAsImage() accepts comma-separated nodeIds and returns
   * temporary CDN URLs for all of them. CDN downloads have no rate limit.
   *
   * This reduces Figma API calls from 2N to just 1 (one batch export call).
   *
   * @returns Number of slides successfully updated with Figma images
   */
  async batchSyncFramesToSlides(
    items: FigmaBatchItem[],
    userId: string,
    fileKey: string,
    lensId?: string | null,
  ): Promise<number> {
    if (items.length === 0) return 0;

    const token = await this.figma.resolveToken(userId, lensId);
    if (!token) {
      throw new NotFoundException(
        'No Figma access token found. Connect Figma in your Pitch Lens or account settings.',
      );
    }

    // Deduplicate nodeIds (multiple slides may map to the same frame)
    const uniqueNodeIds = [...new Set(items.map((i) => i.nodeId))];
    const nodeIdsCsv = uniqueNodeIds.join(',');

    this.logger.log(
      `Batch exporting ${uniqueNodeIds.length} Figma nodes for ${items.length} slides from file ${fileKey}`,
    );

    // 1. ONE Figma API call to get CDN URLs for all frames
    let cdnUrls: Record<string, string | null>;
    try {
      cdnUrls = await this.figma.exportNodesAsImage(token, fileKey, nodeIdsCsv, 'png', 2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('Rate limit')) {
        this.logger.warn(
          `Figma rate-limited during batch export — saving metadata only for ${items.length} slides`,
        );
        // Still save metadata (imageSource=FIGMA) so they can be refreshed later
        await this.saveMetadataOnly(items, fileKey);
        return 0;
      }
      throw err;
    }

    // 2. Download from CDN + upload to S3 in parallel (CDN has no rate limit)
    let applied = 0;
    const downloadTasks = items.map(async (item) => {
      const cdnUrl = cdnUrls[item.nodeId];
      if (!cdnUrl) {
        this.logger.warn(`No CDN URL returned for node ${item.nodeId}, slide ${item.slideId}`);
        await this.updateSlideMetadata(item, fileKey, undefined);
        return;
      }

      try {
        // Download from Figma CDN (no rate limit)
        const imgRes = await fetch(cdnUrl, { signal: AbortSignal.timeout(30_000) });
        if (!imgRes.ok) {
          this.logger.warn(`CDN download failed for node ${item.nodeId}: HTTP ${imgRes.status}`);
          await this.updateSlideMetadata(item, fileKey, undefined);
          return;
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const s3Key = `images/figma/${item.slideId}.png`;
        await this.s3.upload(s3Key, buffer, 'image/png');
        const imageUrl = this.s3.getPublicUrl(s3Key);

        // Update slide with image
        await this.updateSlideMetadata(item, fileKey, imageUrl);

        // Emit WebSocket event
        const slide = await this.prisma.slide.findUnique({
          where: { id: item.slideId },
          select: { presentationId: true },
        });
        if (slide) {
          this.events.emitImageGenerated({
            presentationId: slide.presentationId,
            slideId: item.slideId,
            imageUrl,
          });
        }

        applied++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`Failed to process Figma image for slide ${item.slideId}: ${msg}`);
        await this.updateSlideMetadata(item, fileKey, undefined);
      }
    });

    await Promise.all(downloadTasks);

    this.logger.log(`Batch sync complete: ${applied}/${items.length} slides got Figma images`);
    return applied;
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

  // ── Private helpers ──────────────────────────────────────

  private async updateSlideMetadata(
    item: FigmaBatchItem,
    fileKey: string,
    imageUrl: string | undefined,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      imageSource: ImageSource.FIGMA,
      figmaFileKey: fileKey,
      figmaNodeId: item.nodeId,
    };
    if (item.nodeName) {
      updateData.figmaNodeName = item.nodeName;
    }
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    await this.prisma.slide.update({
      where: { id: item.slideId },
      data: updateData,
    });
  }

  private async saveMetadataOnly(
    items: FigmaBatchItem[],
    fileKey: string,
  ): Promise<void> {
    for (const item of items) {
      await this.updateSlideMetadata(item, fileKey, undefined);
    }
  }
}
