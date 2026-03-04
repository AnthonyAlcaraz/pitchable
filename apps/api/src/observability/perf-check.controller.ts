import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('observability')
export class PerfCheckController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('perf-snapshot')
  async getPerformanceSnapshot() {
    const since7d = new Date(Date.now() - 7 * 86400000);
    const since30d = new Date(Date.now() - 30 * 86400000);

    const [
      latencyByOperation,
      errorsByOperation,
      successRate7d,
      tokenUsage7d,
      slowestOps,
      p95ByOperation,
      totalMetrics7d,
      totalMetrics30d,
      recentErrors,
      activityBreakdown,
      dbTableSizes,
    ] = await Promise.all([
      // Avg latency by operation (7d)
      this.prisma.$queryRaw`
        SELECT operation, model,
          COUNT(*)::int as count,
          AVG("durationMs")::int as "avgMs",
          MIN("durationMs")::int as "minMs",
          MAX("durationMs")::int as "maxMs",
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "durationMs")::int as "p50Ms",
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::int as "p95Ms",
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "durationMs")::int as "p99Ms"
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since7d}
        GROUP BY operation, model
        ORDER BY count DESC
      `,
      // Error count by operation (7d)
      this.prisma.$queryRaw`
        SELECT operation, COUNT(*)::int as errors,
          array_agg(DISTINCT "errorMessage") as messages
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since7d} AND success = false
        GROUP BY operation
        ORDER BY errors DESC
      `,
      // Overall success rate (7d)
      this.prisma.$queryRaw`
        SELECT
          COUNT(*)::int as total,
          SUM(CASE WHEN success THEN 1 ELSE 0 END)::int as successes,
          ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as "successRate"
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since7d}
      `,
      // Token usage (7d)
      this.prisma.$queryRaw`
        SELECT
          SUM("inputTokens")::int as "totalInput",
          SUM("outputTokens")::int as "totalOutput",
          SUM("cacheReadTokens")::int as "totalCacheRead",
          SUM("cacheWriteTokens")::int as "totalCacheWrite",
          AVG("inputTokens")::int as "avgInput",
          AVG("outputTokens")::int as "avgOutput"
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since7d} AND success = true
      `,
      // Top 10 slowest operations (7d)
      this.prisma.$queryRaw`
        SELECT operation, model, "durationMs", "slideType", "slideCount", "createdAt"
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since7d} AND success = true
        ORDER BY "durationMs" DESC
        LIMIT 10
      `,
      // P95 by operation (30d trend - weekly buckets)
      this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('week', "createdAt") as week,
          operation,
          COUNT(*)::int as count,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::int as "p95Ms"
        FROM "GenerationMetric"
        WHERE "createdAt" >= ${since30d} AND success = true
        GROUP BY week, operation
        ORDER BY week, operation
      `,
      // Volume counts
      this.prisma.generationMetric.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.generationMetric.count({ where: { createdAt: { gte: since30d } } }),
      // Recent error activity events
      this.prisma.$queryRaw`
        SELECT "eventType", COUNT(*)::int as count
        FROM "ActivityEvent"
        WHERE "createdAt" >= ${since7d} AND "eventType" LIKE '%_fail%'
        GROUP BY "eventType"
        ORDER BY count DESC
        LIMIT 10
      `,
      // Activity event breakdown (7d)
      this.prisma.$queryRaw`
        SELECT category, COUNT(*)::int as count,
          AVG(duration)::int as "avgDurationMs"
        FROM "ActivityEvent"
        WHERE "createdAt" >= ${since7d}
        GROUP BY category
        ORDER BY count DESC
      `,
      // Table sizes
      this.prisma.$queryRaw`
        SELECT relname as table, reltuples::bigint as "estimatedRows"
        FROM pg_class
        WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY reltuples DESC
        LIMIT 20
      `,
    ]);

    return {
      period: '7d',
      volume: { last7d: totalMetrics7d, last30d: totalMetrics30d },
      latencyByOperation,
      successRate7d,
      errorsByOperation,
      tokenUsage7d,
      slowestOps,
      p95Trend: p95ByOperation,
      recentErrors,
      activityBreakdown,
      dbTableSizes,
    };
  }
}
