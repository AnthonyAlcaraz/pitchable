import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ObservabilityCleanupCron {
  private readonly logger = new Logger(ObservabilityCleanupCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Run daily at 3 AM — prune old observability data. */
  @Cron('0 3 * * *')
  async cleanup() {
    const activityCutoff = new Date(Date.now() - 90 * 86400000); // 90 days
    const metricsCutoff = new Date(Date.now() - 180 * 86400000); // 180 days

    const [activityResult, metricsResult] = await Promise.all([
      this.prisma.activityEvent.deleteMany({
        where: { createdAt: { lt: activityCutoff } },
      }),
      this.prisma.generationMetric.deleteMany({
        where: { createdAt: { lt: metricsCutoff } },
      }),
    ]);

    if (activityResult.count > 0 || metricsResult.count > 0) {
      this.logger.log(
        `Cleanup: deleted ${activityResult.count} activity events (>90d) and ${metricsResult.count} generation metrics (>180d)`,
      );
    }
  }
}
