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
import { JobStatus } from '../../generated/prisma/enums.js';
import type { ImageJobModel } from '../../generated/prisma/models.js';
import type { ImageGenerationJobData } from './image-generation.processor.js';

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptBuilder: ImagePromptBuilderService,
    @InjectQueue('image-generation')
    private readonly imageQueue: Queue<ImageGenerationJobData>,
  ) {}

  async queueImageGeneration(
    slideId: string,
    prompt: { prompt: string; negativePrompt: string },
    userId: string,
  ): Promise<ImageJobModel> {
    // Create ImageJob in DB
    const imageJob = await this.prisma.imageJob.create({
      data: {
        slideId,
        prompt: prompt.prompt,
        status: JobStatus.QUEUED,
      },
    });

    // Add job to BullMQ queue
    await this.imageQueue.add('generate', {
      imageJobId: imageJob.id,
      slideId,
      prompt: prompt.prompt,
      negativePrompt: prompt.negativePrompt,
      userId,
    });

    this.logger.log(
      `Queued image generation job ${imageJob.id} for slide ${slideId}`,
    );

    return imageJob;
  }

  async queueBatchGeneration(
    presentationId: string,
    userId: string,
  ): Promise<ImageJobModel[]> {
    // Get presentation with slides and theme
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        slides: { orderBy: { slideNumber: 'asc' } },
        theme: true,
      },
    });

    if (!presentation) {
      throw new NotFoundException(
        `Presentation with id "${presentationId}" not found`,
      );
    }

    const themeColors: ThemeColors = {
      primaryColor: presentation.theme.primaryColor,
      secondaryColor: presentation.theme.secondaryColor,
      accentColor: presentation.theme.accentColor,
      backgroundColor: presentation.theme.backgroundColor,
      textColor: presentation.theme.textColor,
    };

    const imageJobs: ImageJobModel[] = [];

    for (const slide of presentation.slides) {
      // Skip slides that already have an image
      if (slide.imageUrl) {
        this.logger.log(
          `Skipping slide ${slide.id} (already has image)`,
        );
        continue;
      }

      const prompt = this.promptBuilder.buildPrompt(
        slide.slideType,
        slide.title,
        slide.body,
        themeColors,
      );

      const imageJob = await this.queueImageGeneration(
        slide.id,
        prompt,
        userId,
      );

      // Store the prompt on the slide for reference
      await this.prisma.slide.update({
        where: { id: slide.id },
        data: { imagePrompt: prompt.prompt },
      });

      imageJobs.push(imageJob);
    }

    this.logger.log(
      `Queued ${imageJobs.length} image jobs for presentation ${presentationId}`,
    );

    return imageJobs;
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
    });

    this.logger.log(`Retried image job ${jobId}`);

    return updatedJob;
  }
}
