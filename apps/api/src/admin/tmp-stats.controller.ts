import { Controller, Get, Query, ForbiddenException, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const TMP_SECRET = 'ptchbl-tmp-2026';

@Controller('admin/tmp-stats')
export class TmpStatsController {
  constructor(
    private readonly analytics: AdminAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAllStats(
    @Query('secret') secret: string,
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    if (secret !== TMP_SECRET) throw new ForbiddenException();
    const [overview, users, features, generations, apiKeys, funnel] =
      await Promise.all([
        this.analytics.getOverview(days),
        this.analytics.getUsers(days),
        this.analytics.getFeatures(days),
        this.analytics.getGenerations(days),
        this.analytics.getApiKeys(days),
        this.analytics.getFunnel(days),
      ]);
    return { overview, users, features, generations, apiKeys, funnel };
  }

  @Get('errors')
  async getErrors(@Query('secret') secret: string) {
    if (secret !== TMP_SECRET) throw new ForbiddenException();

    // Failed activity events (last 7 days)
    const failEvents = await this.prisma.$queryRawUnsafe<
      Array<{ eventType: string; category: string; createdAt: Date; userId: string; metadata: unknown }>
    >(
      `SELECT "eventType", "category", "createdAt", "userId", "metadata"
       FROM "ActivityEvent"
       WHERE ("eventType" LIKE '%_fail' OR "eventType" LIKE '%_error' OR "category" = 'error')
       AND "createdAt" >= NOW() - INTERVAL '7 days'
       ORDER BY "createdAt" DESC LIMIT 50`,
    );

    // Failed generations
    const failedGens = await this.prisma.$queryRawUnsafe<
      Array<{ operation: string; model: string; errorMessage: string; createdAt: Date; userId: string }>
    >(
      `SELECT "operation", "model", "errorMessage", "createdAt", "userId"
       FROM "GenerationMetric"
       WHERE "success" = false AND "createdAt" >= NOW() - INTERVAL '7 days'
       ORDER BY "createdAt" DESC LIMIT 50`,
    );

    // Failed exports
    const failedExports = await this.prisma.$queryRawUnsafe<
      Array<{ format: string; status: string; errorMessage: string; createdAt: Date; presentationId: string }>
    >(
      `SELECT "format", "status", "errorMessage", "createdAt", "presentationId"
       FROM "ExportJob"
       WHERE "status" = 'FAILED' AND "createdAt" >= NOW() - INTERVAL '7 days'
       ORDER BY "createdAt" DESC LIMIT 50`,
    );

    // All activity events (last 48h) for pattern analysis
    const recentActivity = await this.prisma.$queryRawUnsafe<
      Array<{ eventType: string; count: bigint }>
    >(
      `SELECT "eventType", COUNT(*) as count
       FROM "ActivityEvent"
       WHERE "createdAt" >= NOW() - INTERVAL '48 hours'
       GROUP BY "eventType" ORDER BY count DESC`,
    );

    // Error count by day (last 7 days)
    const errorsByDay = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT DATE("createdAt") as date, COUNT(*) as count
       FROM "ActivityEvent"
       WHERE ("eventType" LIKE '%_fail' OR "eventType" LIKE '%_error' OR "category" = 'error')
       AND "createdAt" >= NOW() - INTERVAL '7 days'
       GROUP BY DATE("createdAt") ORDER BY date DESC`,
    );

    // Users with signup but no deck (drop-off analysis)
    const dropoffs = await this.prisma.$queryRawUnsafe<
      Array<{ email: string; name: string; createdAt: Date; onboardingCompleted: boolean }>
    >(
      `SELECT u."email", u."name", u."createdAt", u."onboardingCompleted"
       FROM "User" u
       WHERE u."id" NOT IN (SELECT DISTINCT "userId" FROM "Presentation")
       AND u."email" NOT LIKE '%test%'
       ORDER BY u."createdAt" DESC LIMIT 20`,
    );

    return {
      failEvents: failEvents.map(e => ({ ...e, metadata: e.metadata })),
      failedGenerations: failedGens,
      failedExports: failedExports,
      recentActivitySummary: recentActivity.map(r => ({ type: r.eventType, count: Number(r.count) })),
      errorsByDay: errorsByDay.map(r => ({ date: String(r.date), count: Number(r.count) })),
      userDropoffs: dropoffs,
    };
  }
}
