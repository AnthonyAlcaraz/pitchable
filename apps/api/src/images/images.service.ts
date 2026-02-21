import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ImagePromptBuilderService,
  type ThemeColors,
} from './image-prompt-builder.service.js';
import { JobStatus, ImageSource } from '../../generated/prisma/enums.js';
import type { ImageJobModel } from '../../generated/prisma/models.js';
import type { ImageGenerationJobData } from './image-generation.processor.js';
import { CreditsService } from '../credits/credits.service.js';
import { CreditReservationService } from '../credits/credit-reservation.service.js';
import { IMAGE_GENERATION_COST } from '../credits/tier-config.js';

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptBuilder: ImagePromptBuilderService,
    private readonly credits: CreditsService,
    private readonly creditReservation: CreditReservationService,
    @InjectQueue('image-generation')
    private readonly imageQueue: Queue<ImageGenerationJobData>,
  ) {}

  async queueImageGeneration(
    slideId: string,
    prompt: { prompt: string; negativePrompt: string },
    userId: string,
    delayMs = 0,
  ): Promise<ImageJobModel> {
    // Create ImageJob in DB
    const imageJob = await this.prisma.imageJob.create({
      data: {
        slideId,
        prompt: prompt.prompt,
        status: JobStatus.QUEUED,
      },
    });

    // Add job to BullMQ queue with delay + retry backoff (Replicate: 6 req/min limit)
    await this.imageQueue.add(
      'generate',
      {
        imageJobId: imageJob.id,
        slideId,
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        correlationId: randomUUID(),
        timestamp: Date.now(),
        userId,
      },
      {
        ...(delayMs > 0 ? { delay: delayMs } : {}),
        attempts: 3,
        backoff: { type: 'exponential', delay: 15_000 },
      },
    );

    this.logger.log(
      `Queued image generation job ${imageJob.id} for slide ${slideId}${delayMs > 0 ? ` (delay: ${delayMs}ms)` : ''}`,
    );

    return imageJob;
  }

  async queueBatchGeneration(
    presentationId: string,
    userId: string,
  ): Promise<{ jobs: ImageJobModel[]; totalEligible: number; skippedForCredits: number }> {
    // Get presentation with slides, theme, and pitch lens
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        slides: { orderBy: { slideNumber: 'asc' } },
        theme: true,
        pitchLens: { select: { imageFrequency: true, imageLayout: true } },
      },
    });

    if (!presentation) {
      throw new NotFoundException(
        `Presentation with id "${presentationId}" not found`,
      );
    }

    // Image frequency: 1 image every N slides. Default 4. 0 = no images.
    const imageFrequency = presentation.pitchLens?.imageFrequency ?? 4;

    if (imageFrequency === 0) {
      this.logger.log(
        `Image generation disabled for presentation ${presentationId} (imageFrequency=0)`,
      );
      return { jobs: [], totalEligible: 0, skippedForCredits: 0 };
    }

    const themeColors: ThemeColors = {
      primaryColor: presentation.theme.primaryColor,
      secondaryColor: presentation.theme.secondaryColor,
      accentColor: presentation.theme.accentColor,
      backgroundColor: presentation.theme.backgroundColor,
      textColor: presentation.theme.textColor,
    };

    // Select which slides get images based on frequency + priority
    const eligibleSlides = this.selectSlidesForImages(
      presentation.slides,
      imageFrequency,
    );

    // Filter out slides that already have images or are Figma-sourced
    const needsImage = eligibleSlides.filter((slide) => {
      if (
        (slide as Record<string, unknown>).imageSource === ImageSource.FIGMA &&
        slide.imageUrl
      ) {
        return false;
      }
      return !slide.imageUrl;
    });

    const totalEligible = needsImage.length;

    // Credit pre-check: cap batch to what the user can afford (accounts for active reservations)
    const balance = await this.creditReservation.getAvailableBalance(userId);
    const affordableCount = Math.floor(balance / IMAGE_GENERATION_COST);
    const skippedForCredits = Math.max(0, totalEligible - affordableCount);
    const slidesToProcess = needsImage.slice(0, affordableCount);

    if (skippedForCredits > 0) {
      this.logger.warn(
        `Presentation ${presentationId}: user has ${balance} credits, can afford ${affordableCount}/${totalEligible} images (skipping ${skippedForCredits})`,
      );
    }

    if (slidesToProcess.length === 0) {
      this.logger.log(
        `No images queued for presentation ${presentationId} (eligible: ${totalEligible}, affordable: ${affordableCount})`,
      );
      return { jobs: [], totalEligible, skippedForCredits };
    }

    const imageJobs: ImageJobModel[] = [];
    // Stagger jobs by 12s each to avoid Replicate API rate limits (6 req/min)
    const STAGGER_MS = 8_000;
    let jobIndex = 0;

    for (const slide of slidesToProcess) {
      // Use the LLM's imagePromptHint when available (stored as slide.imagePrompt),
      // fall back to building a prompt from slide type/content
      let prompt: { prompt: string; negativePrompt: string };
      if (slide.imagePrompt && slide.imagePrompt.trim()) {
        prompt = this.promptBuilder.buildPromptFromHint(
          slide.imagePrompt,
          slide.slideType,
          themeColors,
        );
        this.logger.log(
          `Using LLM imagePromptHint for slide ${slide.id}: "${slide.imagePrompt.slice(0, 80)}..."`,
        );
      } else {
        prompt = this.promptBuilder.buildPrompt(
          slide.slideType,
          slide.title,
          slide.body,
          themeColors,
        );
        // Store the generated prompt on the slide for reference
        await this.prisma.slide.update({
          where: { id: slide.id },
          data: { imagePrompt: prompt.prompt },
        });
      }

      const imageJob = await this.queueImageGeneration(
        slide.id,
        prompt,
        userId,
        jobIndex * STAGGER_MS,
      );
      jobIndex++;

      imageJobs.push(imageJob);
    }

    this.logger.log(
      `Queued ${imageJobs.length}/${presentation.slides.length} image jobs for presentation ${presentationId} (frequency: 1 per ${imageFrequency})`,
    );

    return { jobs: imageJobs, totalEligible, skippedForCredits };
  }

  /**
   * Select which slides get images based on frequency and slide type priority.
   * Priority order: TITLE > ARCHITECTURE > PROBLEM/SOLUTION > CTA > DATA_METRICS > others
   * Ensures even distribution across the deck.
   */
  private selectSlidesForImages<T extends { id: string; slideNumber: number; slideType: string; imageUrl: string | null; imagePrompt: string | null }>(
    slides: T[],
    frequency: number,
  ): T[] {
    if (frequency <= 1) return slides; // Every slide gets an image

    const totalSlides = slides.length;
    const targetCount = Math.max(1, Math.ceil(totalSlides / frequency));
    // Minimum 4 images per deck (user preference), but don't exceed total slides
    const minImages = Math.min(totalSlides, Math.max(4, targetCount));

    // Force-include slides that MUST have images
    const mustIncludeTypes = new Set(['TITLE', 'CTA', 'VISUAL_HUMOR']);
    const forced = slides.filter((s) => mustIncludeTypes.has(s.slideType));
    const forcedIds = new Set(forced.map((s) => s.id));

    // Remaining slots for scored selection
    const remainingSlots = Math.max(0, minImages - forced.length);
    const candidates = slides.filter((s) => !forcedIds.has(s.id));

    // Priority scores: higher = more likely to get an image
    const typePriority: Record<string, number> = {
      TITLE: 10,
      ARCHITECTURE: 9,
      PROBLEM: 7,
      SOLUTION: 7,
      CTA: 6,
      DATA_METRICS: 5,
      PROCESS: 4,
      COMPARISON: 3,
      QUOTE: 2,
      CONTENT: 1,
      VISUAL_HUMOR: 11,
    };

    // Score remaining candidates
    const scored = candidates.map((slide, idx) => {
      const priority = typePriority[slide.slideType] ?? 1;
      const idealPositions = Array.from({ length: minImages }, (_, i) =>
        Math.round((i * totalSlides) / minImages),
      );
      const positionBonus = idealPositions.some(
        (pos) => Math.abs(pos - slides.indexOf(slide)) <= 1,
      )
        ? 3
        : 0;
      return { slide, score: priority + positionBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    const additionalSlides = scored.slice(0, remainingSlots).map((s) => s.slide);

    const selected = [...forced, ...additionalSlides];
    // Re-sort by slide number for sequential processing
    selected.sort((a, b) => a.slideNumber - b.slideNumber);

    this.logger.log(
      `Selected ${selected.length} slides for images: ${selected.map((s) => `#${s.slideNumber} (${s.slideType})`).join(', ')}`,
    );

    return selected;
  }

  async getJobStatus(jobId: string): Promise<ImageJobModel> {
    const job = await this.prisma.imageJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(
        `Image job with id "${jobId}" not found`,
      );
    }

    return job;
  }

  async getJobsForPresentation(
    presentationId: string,
  ): Promise<ImageJobModel[]> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { id: true },
    });

    if (!presentation) {
      throw new NotFoundException(
        `Presentation with id "${presentationId}" not found`,
      );
    }

    return this.prisma.imageJob.findMany({
      where: {
        slide: { presentationId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async retryJob(jobId: string): Promise<ImageJobModel> {
    const existingJob = await this.prisma.imageJob.findUnique({
      where: { id: jobId },
      include: { slide: true },
    });

    if (!existingJob) {
      throw new NotFoundException(
        `Image job with id "${jobId}" not found`,
      );
    }

    if (existingJob.status !== JobStatus.FAILED) {
      throw new BadRequestException(
        `Can only retry FAILED jobs (current status: ${existingJob.status})`,
      );
    }

    // Reset the job status
    const updatedJob = await this.prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.QUEUED,
        errorMessage: null,
        completedAt: null,
        resultUrl: null,
        imgurUrl: null,
      },
    });

    // Look up presentation to find user
    const slide = await this.prisma.slide.findUnique({
      where: { id: existingJob.slideId },
      include: { presentation: { select: { userId: true } } },
    });

    if (!slide) {
      throw new NotFoundException(
        `Slide for job "${jobId}" not found`,
      );
    }

    // Re-queue in BullMQ
    await this.imageQueue.add('generate', {
      imageJobId: jobId,
      slideId: existingJob.slideId,
      prompt: existingJob.prompt,
      negativePrompt:
        'text, words, labels, numbers, letters, watermark, low quality, blurry, cartoon, anime, photorealistic faces, hands',
      userId: slide.presentation.userId,
      correlationId: randomUUID(),
      timestamp: Date.now(),
    });

    this.logger.log(`Retried image job ${jobId}`);

    return updatedJob;
  }
}
