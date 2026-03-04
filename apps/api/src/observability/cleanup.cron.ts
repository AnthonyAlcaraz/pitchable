import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ObservabilityCleanupCron {
  private readonly logger = new Logger(ObservabilityCleanupCron.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly BATCH_SIZE = 5000;
  private readonly BATCH_DELAY_MS = 100;

  /** Delete rows in batches of BATCH_SIZE to avoid long table locks. */
  private async batchDelete(
    model: 'activityEvent' | 'generationMetric',
    cutoff: Date,
  ): Promise<number> {
    let totalDeleted = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const ids = await (this.prisma[model] as any).findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: this.BATCH_SIZE,
      });
      if (ids.length === 0) break;

      const result = await (this.prisma[model] as any).deleteMany({
        where: { id: { in: ids.map((r: { id: string }) => r.id) } },
      });
      totalDeleted += result.count;

      if (ids.length < this.BATCH_SIZE) break;
      await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
    }
    return totalDeleted;
  }

  /** Run daily at 3 AM — prune old observability data. */
  @Cron('0 3 * * *')
  async cleanup() {
    const activityCutoff = new Date(Date.now() - 90 * 86400000); // 90 days
    const metricsCutoff = new Date(Date.now() - 180 * 86400000); // 180 days

    const [activityDeleted, metricsDeleted] = await Promise.all([
      this.batchDelete('activityEvent', activityCutoff),
      this.batchDelete('generationMetric', metricsCutoff),
    ]);

    if (activityDeleted > 0 || metricsDeleted > 0) {
      this.logger.log(
        `Cleanup: deleted ${activityDeleted} activity events (>90d) and ${metricsDeleted} generation metrics (>180d)`,
      );
    }
  }
}
