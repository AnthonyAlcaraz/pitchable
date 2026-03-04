import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('observability')
export class PerfCheckController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('perf-snapshot')
  async getPerformanceSnapshot() {
    const since7d = new Date(Date.now() - 7 * 86400000);
    const since30d = new Date(Date.now() - 30 * 86400000);

    const results: Record<string, unknown> = {};

    // 1. Latency by operation (7d)
    results.latencyByOperation = await this.prisma.$queryRaw`
      SELECT operation, model,
        COUNT(*)::int as count,
        AVG("durationMs")::int as "avgMs",
        MIN("durationMs")::int as "minMs",
        MAX("durationMs")::int as "maxMs"
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since7d}
      GROUP BY operation, model
      ORDER BY count DESC
    `;

    // 2. Success rate (7d)
    results.successRate = await this.prisma.$queryRaw`
      SELECT
        COUNT(*)::int as total,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::int as successes
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since7d}
    `;

    // 3. Errors by operation (7d)
    results.errors = await this.prisma.$queryRaw`
      SELECT operation, COUNT(*)::int as errors
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since7d} AND success = false
      GROUP BY operation
      ORDER BY errors DESC
    `;

    // 4. Token usage (7d)
    results.tokenUsage = await this.prisma.$queryRaw`
      SELECT
        SUM("inputTokens")::int as "totalInput",
        SUM("outputTokens")::int as "totalOutput",
        SUM("cacheReadTokens")::int as "totalCacheRead",
        SUM("cacheWriteTokens")::int as "totalCacheWrite",
        AVG("inputTokens")::int as "avgInput",
        AVG("outputTokens")::int as "avgOutput"
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since7d} AND success = true
    `;

    // 5. Top 10 slowest ops (7d)
    results.slowestOps = await this.prisma.$queryRaw`
      SELECT operation, model, "durationMs", "slideType", "slideCount",
        TO_CHAR("createdAt", 'YYYY-MM-DD HH24:MI') as "at"
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since7d} AND success = true
      ORDER BY "durationMs" DESC
      LIMIT 10
    `;

    // 6. Activity event breakdown (7d)
    results.activityBreakdown = await this.prisma.$queryRaw`
      SELECT category, COUNT(*)::int as count,
        AVG(duration)::int as "avgDurationMs"
      FROM "ActivityEvent"
      WHERE "createdAt" >= ${since7d}
      GROUP BY category
      ORDER BY count DESC
    `;

    // 7. Error events (7d)
    results.errorEvents = await this.prisma.$queryRaw`
      SELECT "eventType", COUNT(*)::int as count
      FROM "ActivityEvent"
      WHERE "createdAt" >= ${since7d} AND ("eventType" LIKE '%fail%' OR "eventType" LIKE '%error%')
      GROUP BY "eventType"
      ORDER BY count DESC
      LIMIT 15
    `;

    // 8. Volume
    results.volume = {
      metrics7d: await this.prisma.generationMetric.count({ where: { createdAt: { gte: since7d } } }),
      metrics30d: await this.prisma.generationMetric.count({ where: { createdAt: { gte: since30d } } }),
      events7d: await this.prisma.activityEvent.count({ where: { createdAt: { gte: since7d } } }),
    };

    // 9. Daily latency trend (30d)
    results.dailyLatencyTrend = await this.prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD') as day,
        COUNT(*)::int as count,
        AVG("durationMs")::int as "avgMs",
        MAX("durationMs")::int as "maxMs"
      FROM "GenerationMetric"
      WHERE "createdAt" >= ${since30d} AND success = true
      GROUP BY day
      ORDER BY day
    `;

    return results;
  }
}
