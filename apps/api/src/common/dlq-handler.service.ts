import { Injectable, Logger } from '@nestjs/common';
import type { BaseJobData } from './base-job-data.js';

@Injectable()
export class DlqHandlerService {
  private readonly logger = new Logger(DlqHandlerService.name);

  /**
   * Log a failed job to the DLQ handler.
   * Called when a BullMQ job exceeds max retries.
   */
  handleFailedJob(queue: string, jobId: string, data: BaseJobData & Record<string, unknown>, error: string): void {
    const correlationId = data.correlationId ?? 'legacy';
    const userId = data.userId ?? 'unknown';

    this.logger.error(
      `DLQ: queue=${queue} jobId=${jobId} correlationId=${correlationId} userId=${userId} error=${error}`,
    );
  }
}
