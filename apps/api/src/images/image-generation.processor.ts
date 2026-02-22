import type { BaseJobData } from '../common/base-job-data.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { NanoBananaService } from './nano-banana.service.js';
import { ImageCriticService, type CriticEvaluation } from './image-critic.service.js';
import { ImgurService } from './imgur.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { IMAGE_GENERATION_COST } from '../credits/tier-config.js';
import { EventsGateway } from '../events/events.gateway.js';
import { InteractionGateService } from '../chat/interaction-gate.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { JobStatus, CreditReason } from '../../generated/prisma/enums.js';

/** Generate an SVG placeholder when image generation fails. */
function createPlaceholderSvg(title: string): { base64: string; mimeType: string } {
  const sanitized = title.replace(/[<>&"']/g, '').slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#1c1c1c"/>
  <text x="512" y="480" text-anchor="middle" fill="#666" font-family="sans-serif" font-size="24">Image generating...</text>
  <text x="512" y="520" text-anchor="middle" fill="#444" font-family="sans-serif" font-size="16">${sanitized}</text>
</svg>`;
  return { base64: Buffer.from(svg).toString('base64'), mimeType: 'image/svg+xml' };
}

// ── Job Data Interface ──────────────────────────────────────

export interface ImageGenerationJobData extends BaseJobData {
  imageJobId: string;
  slideId: string;
  prompt: string;
  negativePrompt: string;
}

// ── Processor ───────────────────────────────────────────────

@Processor('image-generation', { concurrency: 3 } as Record<string, unknown>)
export class ImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageGenerationProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly nanoBanana: NanoBananaService,
    private readonly critic: ImageCriticService,
    private readonly imgur: ImgurService,
    private readonly s3: S3Service,
    private readonly credits: CreditsService,
    private readonly events: EventsGateway,
    private readonly interactionGate: InteractionGateService,
    private readonly exports: ExportsService,
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

      // Early progress: starting (also stores presentationId for later progress events)
      const earlySlide = await this.prisma.slide.findUnique({ where: { id: slideId }, select: { presentationId: true } });
      const progressPresId = earlySlide?.presentationId ?? '';
      if (progressPresId) {
        this.events.emitGenerationProgress({
          presentationId: progressPresId,
          step: `image-${slideId}`,
          progress: 0.1,
          message: 'Starting image generation...',
        });
      }

      // 2. Load slide context for critic evaluation
      const slideData = await this.prisma.slide.findUnique({
        where: { id: slideId },
        select: { title: true, body: true, slideType: true },
      });

      // 3. PaperBanana Critic Loop: Generate → Evaluate → Refine (up to N rounds)
      // Generate at least 2 candidates for user selection when critic is enabled
      const maxRounds = this.critic.isEnabled() ? Math.max(this.critic.getMaxRounds(), 2) : 1;
      let currentPrompt = prompt;
      let bestBase64 = '';
      let bestMimeType = '';
      let bestScore = 0;
      let bestEval: CriticEvaluation | null = null;
      let accepted = false;

      // Collect all candidates for user selection
      const candidates: Array<{
        id: string;
        base64: string;
        mimeType: string;
        score: number;
        prompt: string;
        evaluation: CriticEvaluation;
      }> = [];

      for (let round = 1; round <= maxRounds; round++) {
        // Progress: generating round N
        if (progressPresId) {
          this.events.emitGenerationProgress({
            presentationId: progressPresId,
            step: `image-${slideId}`,
            progress: 0.2 + (round - 1) * 0.2,
            message: `Generating image (round ${round}/${maxRounds})...`,
          });
        }

        // Generate image via Replicate Imagen 3 (NanoBanana)
        let base64: string;
        let mimeType: string;
        try {
          ({ base64, mimeType } = await this.nanoBanana.generateImage(
            currentPrompt,
            negativePrompt,
          ));
        } catch (genErr) {
          this.logger.warn(
            `NanoBanana generation failed (round ${round}): ${genErr instanceof Error ? genErr.message : 'unknown'}`,
          );
          // Fallback: create placeholder SVG and mark as PENDING_RETRY
          const placeholder = createPlaceholderSvg(slideData?.title ?? 'Slide');
          const placeholderUrl = await this.uploadToS3(slideId, placeholder.base64, placeholder.mimeType);
          await this.prisma.slide.update({
            where: { id: slideId },
            data: { imageUrl: placeholderUrl },
          });
          await this.prisma.imageJob.update({
            where: { id: imageJobId },
            data: {
              status: JobStatus.PENDING_RETRY,
              imgurUrl: placeholderUrl,
              errorMessage: genErr instanceof Error ? genErr.message : 'Generation failed',
              completedAt: new Date(),
            },
          });
          const errSlide = await this.prisma.slide.findUnique({ where: { id: slideId }, select: { presentationId: true } });
          if (errSlide?.presentationId) {
            this.events.emitImageGenerated({
              presentationId: errSlide.presentationId,
              slideId,
              imageUrl: placeholderUrl,
            });
            await this.checkAllImagesComplete(errSlide.presentationId);
          }
          return; // Exit process() — don't block deck completion
        }

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

        // Progress: evaluation score
        if (progressPresId) {
          this.events.emitGenerationProgress({
            presentationId: progressPresId,
            step: `image-${slideId}`,
            progress: 0.3 + (round - 1) * 0.2,
            message: `Scored ${evaluation.averageScore.toFixed(1)}/10 (round ${round})`,
          });
        }

        // Collect candidate
        const candidateId = `candidate-${slideId}-${round}`;
        candidates.push({
          id: candidateId,
          base64,
          mimeType,
          score: evaluation.averageScore,
          prompt: currentPrompt,
          evaluation,
        });

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
          // Don't break early — keep generating to offer alternatives
          if (candidates.length >= 2) break;
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

      // Progress: uploading
      if (progressPresId) {
        this.events.emitGenerationProgress({
          presentationId: progressPresId,
          step: `image-${slideId}`,
          progress: 0.75,
          message: 'Uploading candidates...',
        });
      }

      // 4. Upload all candidates to S3 and offer user selection
      const uploadedCandidates: Array<{ id: string; imageUrl: string; score: number; prompt: string }> = [];

      for (const candidate of candidates) {
        try {
          const ext = candidate.mimeType.includes('png') ? 'png' : 'jpg';
          const key = `images/slides/${slideId}-${candidate.id}.${ext}`;
          const buffer = Buffer.from(candidate.base64, 'base64');
          await this.s3.upload(key, buffer, candidate.mimeType);
          const url = this.s3.getPublicUrl(key);
          uploadedCandidates.push({
            id: candidate.id,
            imageUrl: url,
            score: candidate.score,
            prompt: candidate.prompt,
          });
        } catch {
          this.logger.warn(`Failed to upload candidate ${candidate.id}, skipping`);
        }
      }

      // If we have multiple candidates, offer selection via WebSocket
      let selectedImageUrl: string;
      if (uploadedCandidates.length > 1) {
        const contextId = `image-${slideId}-${Date.now()}`;
        const timeoutMs = 30_000;

        // Sort by score descending — best first
        uploadedCandidates.sort((a, b) => b.score - a.score);

        // Get presentationId for WebSocket emission
        const slideRecord = await this.prisma.slide.findUnique({
          where: { id: slideId },
          select: { presentationId: true },
        });
        const presId = slideRecord?.presentationId ?? '';

        // Progress: waiting for selection
        if (progressPresId) {
          this.events.emitGenerationProgress({
            presentationId: progressPresId,
            step: `image-${slideId}`,
            progress: 0.85,
            message: 'Waiting for selection...',
          });
        }

        this.events.emitImageSelectionRequest({
          presentationId: presId,
          slideId,
          contextId,
          candidates: uploadedCandidates,
          defaultImageId: uploadedCandidates[0].id,
          timeoutMs,
        });

        const selectedId = await this.interactionGate.waitForResponse<string>(
          presId,
          'image_selection',
          contextId,
          uploadedCandidates[0].id,
          timeoutMs,
        );

        const selected = uploadedCandidates.find((c) => c.id === selectedId);
        selectedImageUrl = selected?.imageUrl ?? uploadedCandidates[0].imageUrl;

        // Cleanup unselected candidates from S3 (best-effort)
        for (const c of uploadedCandidates) {
          if (c.id !== selectedId) {
            const ext = c.imageUrl.endsWith('.png') ? 'png' : 'jpg';
            const key = `images/slides/${slideId}-${c.id}.${ext}`;
            this.s3.delete(key).catch(() => {});
          }
        }
      } else {
        // Single candidate or S3 upload failed — use best from memory
        try {
          selectedImageUrl = await this.uploadToS3(slideId, bestBase64, bestMimeType);
          this.logger.log(`Image uploaded to S3: ${selectedImageUrl}`);
        } catch (s3Err) {
          this.logger.warn(`S3 upload failed, trying Imgur: ${s3Err instanceof Error ? s3Err.message : 'unknown'}`);
          selectedImageUrl = await this.imgur.uploadFromBase64(bestBase64, `slide-${slideId}`);
          this.logger.log(`Image uploaded to Imgur: ${selectedImageUrl}`);
        }
      }

      const imageUrl = selectedImageUrl;

      // Progress: complete
      if (progressPresId) {
        this.events.emitGenerationProgress({
          presentationId: progressPresId,
          step: `image-${slideId}`,
          progress: 1,
          message: 'Image ready',
        });
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

      // Progress: error
      try {
        const errSlide = await this.prisma.slide.findUnique({ where: { id: slideId }, select: { presentationId: true } });
        if (errSlide?.presentationId) {
          this.events.emitGenerationProgress({
            presentationId: errSlide.presentationId,
            step: `image-${slideId}`,
            progress: -1,
            message: errorMessage,
          });
        }
      } catch { /* ignore progress emission failure */ }

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
   * Upload base64 image to R2/S3 and return a direct URL.
   */
  private async uploadToS3(slideId: string, base64: string, mimeType: string): Promise<string> {
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const key = `images/slides/${slideId}.${extension}`;
    const buffer = Buffer.from(base64, 'base64');

    await this.s3.upload(key, buffer, mimeType);
    return this.s3.getPublicUrl(key);
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
      this.logger.log(
        `All images complete for presentation ${presentationId} — regenerating previews`,
      );
      try {
        await this.exports.generatePreviewsForPresentation(presentationId);
        this.logger.log(`Preview images regenerated with final images for ${presentationId}`);
      } catch (previewErr) {
        this.logger.warn(
          `Failed to regenerate previews after images: ${previewErr instanceof Error ? previewErr.message : 'unknown'}`,
        );
      }
      this.events.emitImagesComplete({ presentationId });
    }
  }
}
