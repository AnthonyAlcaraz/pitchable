import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FigmaWebhookService } from './figma-webhook.service.js';

interface FigmaSyncJobData {
  fileKey: string;
  userId: string;
}

@Processor('figma-sync', { concurrency: 1 })
export class FigmaSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(FigmaSyncProcessor.name);

  constructor(
    private readonly webhookService: FigmaWebhookService,
  ) {
    super();
  }

  async process(job: Job<FigmaSyncJobData>): Promise<void> {
    const { fileKey, userId } = job.data;
    this.logger.log(`Processing figma-sync job for file ${fileKey}`);

    try {
      await this.webhookService.processFileUpdate(fileKey, userId);
      this.logger.log(`Figma sync completed for file ${fileKey}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Figma sync failed for file ${fileKey}: ${msg}`);
      throw err;
    }
  }
}
