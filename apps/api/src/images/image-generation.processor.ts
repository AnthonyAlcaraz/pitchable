import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReplicateService } from './replicate.service.js';
import { ImgurService } from './imgur.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { JobStatus, CreditReason } from '../../generated/prisma/enums.js';

// ── Job Data Interface ──────────────────────────────────────

export interface ImageGenerationJobData {
  imageJobId: string;
  slideId: string;
  prompt: string;
  negativePrompt: string;
  userId: string;
}

// ── Processor ───────────────────────────────────────────────

@Processor('image-generation')
export class ImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly replicate: ReplicateService,
    private readonly imgur: ImgurService,
    private readonly credits: CreditsService,
  ) {
    super();
  }

  async process(job: Job<ImageGenerationJobData>): Promise<void> {
    const { imageJobId, slideId, prompt, negativePrompt, userId } = job.data;

    this.logger.log(
      `Processing image job ${imageJobId} for slide ${slideId}`,
    );

    try {
      // 1. Update ImageJob status to PROCESSING
      await this.prisma.imageJob.update({
        where: { id: imageJobId },
        data: { status: JobStatus.PROCESSING },
      });

      // 2. Generate image via Replicate
      const resultUrl = await this.replicate.generateImage(
        prompt,
        negativePrompt,
      );

      // 3. Upload to Imgur for permanent hosting
      const imgurUrl = await this.imgur.uploadFromUrl(
        resultUrl,
        `slide-${slideId}`,
      );

      // 4. Update ImageJob with results
      await this.prisma.imageJob.update({
        where: { id: imageJobId },
        data: {
          resultUrl,
          imgurUrl,
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // 5. Update Slide.imageUrl with the Imgur URL
      await this.prisma.slide.update({
        where: { id: slideId },
        data: { imageUrl: imgurUrl },
      });

      // 6. Deduct 1 credit from user
      await this.credits.deductCredits(
        userId,
        1,
        CreditReason.IMAGE_GENERATION,
        imageJobId,
      );

      this.logger.log(
        `Image job ${imageJobId} completed successfully: ${imgurUrl}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Image job ${imageJobId} failed: ${errorMessage}`,
      );

      // Update ImageJob status to FAILED with error message
      await this.prisma.imageJob.update({
        where: { id: imageJobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
