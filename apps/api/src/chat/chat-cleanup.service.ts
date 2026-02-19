import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Periodic cleanup of stale chat data to prevent unbounded DB growth.
 *
 * Runs daily at 3 AM:
 * - Deletes chat messages older than 90 days for presentations that are COMPLETED or FAILED
 * - Deletes orphaned feedback entries older than 90 days
 * - Logs cleanup stats
 */
@Injectable()
export class ChatCleanupService {
  private readonly logger = new Logger(ChatCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldMessages(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    try {
      // Delete old chat messages for completed/failed presentations
      const deleted = await this.prisma.chatMessage.deleteMany({
        where: {
          createdAt: { lt: cutoff },
          presentation: {
            status: { in: ['COMPLETED', 'FAILED'] },
          },
        },
      });

      // Clean up old feedback entries
      const feedbackDeleted = await this.prisma.feedbackEntry.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });

      if (deleted.count > 0 || feedbackDeleted.count > 0) {
        this.logger.log(
          `Chat cleanup: deleted ${deleted.count} messages and ${feedbackDeleted.count} feedback entries older than 90 days`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Chat cleanup failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
