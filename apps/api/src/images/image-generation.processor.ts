import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { NanoBananaService } from './nano-banana.service.js';
import { ImageCriticService, type CriticEvaluation } from './image-critic.service.js';
import { ImgurService } from './imgur.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { IMAGE_GENERATION_COST } from '../credits/tier-config.js';
import { EventsGateway } from '../events/events.gateway.js';
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

@Processor('image-generation', { concurrency: 1 })
export class ImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageGenerationProcessor.name);
  private readonly s3Endpoint: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly nanoBanana: NanoBananaService,
    private readonly critic: ImageCriticService,
    private readonly imgur: ImgurService,
    private readonly s3: S3Service,
    private readonly credits: CreditsService,
    private readonly events: EventsGateway,
    configService: ConfigService,
  ) {
    super();
    this.s3Endpoint = configService.get<string>('S3_ENDPOINT', 'http://localhost:9000')!;
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

      // 2. Load slide context for critic evaluation
      const slideData = await this.prisma.slide.findUnique({
        where: { id: slideId },
        select: { title: true, body: true, slideType: true },
      });

      // 3. PaperBanana Critic Loop: Generate → Evaluate → Refine (up to N rounds)
      const maxRounds = this.critic.isEnabled() ? this.critic.getMaxRounds() : 1;
      let currentPrompt = prompt;
      let bestBase64 = '';
      let bestMimeType = '';
      let bestScore = 0;
      let bestEval: CriticEvaluation | null = null;
      let accepted = false;

      for (let round = 1; round <= maxRounds; round++) {
        // Generate image via Replicate Imagen 3 (NanoBanana)
        const { base64, mimeType } = await this.nanoBanana.generateImage(
          currentPrompt,
          negativePrompt,
        );

        // Evaluate with PaperBanana Critic
        const evaluation = await this.critic.evaluate(
          base64,
          mimeType,
          slideData?.title ?? '',
          slideData?.body ?? '',
          slideData?.slideType ?? 'CONTENT',
        );

        this.logger.log(
          `Image critic round ${round}/${maxRounds}: avg=${evaluation.averageScore.toFixed(1)} ` +
          `[F:${evaluation.scores.faithfulness} R:${evaluation.scores.readability} ` +
          `C:${evaluation.scores.conciseness} A:${evaluation.scores.aesthetics}] ` +
          `${evaluation.accepted ? 'ACCEPTED' : 'REJECTED'}`,
        );

        // Track best result across all rounds
        if (evaluation.averageScore > bestScore) {
          bestScore = evaluation.averageScore;
          bestBase64 = base64;
          bestMimeType = mimeType;
          bestEval = evaluation;
        }

        if (evaluation.accepted) {
          bestBase64 = base64;
          bestMimeType = mimeType;
          bestEval = evaluation;
          accepted = true;
          break;
        }

        // Refine prompt for next round
        if (round < maxRounds && evaluation.refinements.length > 0) {
          currentPrompt = this.critic.refinePrompt(currentPrompt, evaluation.refinements);
          this.logger.log(
            `Refining prompt for round ${round + 1}: ${evaluation.refinements.join('; ')}`,
          );
        }
      }

      if (!accepted && maxRounds > 1) {
        this.logger.log(
          `Using best-scored image (avg: ${bestScore.toFixed(1)}) after ${maxRounds} rounds`,
        );
      }

      // 4. Upload best image — try S3/MinIO first, fall back to Imgur
      let imageUrl: string;
      try {
        imageUrl = await this.uploadToS3(slideId, bestBase64, bestMimeType);
        this.logger.log(`Image uploaded to S3: ${imageUrl}`);
      } catch (s3Err) {
        this.logger.warn(`S3 upload failed, trying Imgur: ${s3Err instanceof Error ? s3Err.message : 'unknown'}`);
        imageUrl = await this.imgur.uploadFromBase64(bestBase64, `slide-${slideId}`);
        this.logger.log(`Image uploaded to Imgur: ${imageUrl}`);
      }

      // 5. Update ImageJob with results + critic metrics
      await this.prisma.imageJob.update({
        where: { id: imageJobId },
        data: {
          resultUrl: null,
          imgurUrl: imageUrl,
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // 6. Update Slide.imageUrl
      const slide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { imageUrl },
        select: { presentationId: true },
      });

      // 7. Deduct credits per image (uses configured cost, not per-round)
      await this.credits.deductCredits(
        userId,
        IMAGE_GENERATION_COST,
        CreditReason.IMAGE_GENERATION,
        imageJobId,
      );

      // 8. Emit WebSocket event for real-time UI update
      this.events.emitImageGenerated({
        presentationId: slide.presentationId,
        slideId,
        imageUrl,
      });

      // 9. Check if all images for this presentation are done
      await this.checkAllImagesComplete(slide.presentationId);

      this.logger.log(
        `Image job ${imageJobId} completed: ${imageUrl} ` +
        `(critic: avg=${bestEval?.averageScore.toFixed(1) ?? 'N/A'}, ` +
        `accepted=${accepted})`,
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

  /**
   * Upload base64 image to S3/MinIO and return a direct URL.
   */
  private async uploadToS3(slideId: string, base64: string, mimeType: string): Promise<string> {
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const key = `images/slides/${slideId}.${extension}`;
    const buffer = Buffer.from(base64, 'base64');

    await this.s3.upload(key, buffer, mimeType);

    // Return direct MinIO/S3 URL (publicly accessible in local dev)
    const bucket = 'pitchable-documents';
    return `${this.s3Endpoint}/${bucket}/${key}`;
  }

  /**
   * Check if all image jobs for a presentation are complete.
   * If so, emit an images:complete event.
   */
  private async checkAllImagesComplete(
    presentationId: string,
  ): Promise<void> {
    const pendingJobs = await this.prisma.imageJob.count({
      where: {
        slide: { presentationId },
        status: { in: [JobStatus.QUEUED, JobStatus.PROCESSING] },
      },
    });

    if (pendingJobs === 0) {
      this.events.emitImagesComplete({ presentationId });
      this.logger.log(
        `All images complete for presentation ${presentationId}`,
      );
    }
  }
}
