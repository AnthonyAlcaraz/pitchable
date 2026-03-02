import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    // Active users (distinct users with any activity)
    const activeUsers = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(DISTINCT "userId") as count FROM "ActivityEvent" WHERE "createdAt" >= $1 AND "userId" IS NOT NULL`,
      since,
    );

    // Decks created
    const decksCreated = await this.prisma.presentation.count({
      where: { createdAt: { gte: since } },
    });

    // Total exports
    const exports = await this.prisma.exportJob.count({
      where: { createdAt: { gte: since }, status: 'COMPLETED' },
    });

    // Signups
    const signups = await this.prisma.user.count({
      where: { createdAt: { gte: since } },
    });

    // Total users
    const totalUsers = await this.prisma.user.count();

    // Daily time series for decks
    const dailyDecks = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT DATE("createdAt") as date, COUNT(*) as count FROM "Presentation" WHERE "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date`,
      since,
    );

    // Daily signups
    const dailySignups = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT DATE("createdAt") as date, COUNT(*) as count FROM "User" WHERE "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date`,
      since,
    );

    return {
      activeUsers: Number(activeUsers[0]?.count ?? 0),
      decksCreated,
      exports,
      signups,
      totalUsers,
      dailyDecks: dailyDecks.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
      dailySignups: dailySignups.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    };
  }

  async getUsers(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    // Tier distribution
    const tierDistribution = await this.prisma.$queryRawUnsafe<
      Array<{ tier: string; count: bigint }>
    >(
      `SELECT "tier", COUNT(*) as count FROM "User" GROUP BY "tier" ORDER BY count DESC`,
    );

    // Top users by activity
    const topUsers = await this.prisma.$queryRawUnsafe<
      Array<{
        userId: string;
        email: string;
        name: string;
        eventCount: bigint;
      }>
    >(
      `SELECT ae."userId", u."email", u."name", COUNT(*) as "eventCount"
       FROM "ActivityEvent" ae JOIN "User" u ON ae."userId" = u."id"
       WHERE ae."createdAt" >= $1 AND ae."userId" IS NOT NULL
       GROUP BY ae."userId", u."email", u."name"
       ORDER BY "eventCount" DESC LIMIT 20`,
      since,
    );

    return {
      tierDistribution: tierDistribution.map((r) => ({
        tier: r.tier,
        count: Number(r.count),
      })),
      topUsers: topUsers.map((r) => ({
        userId: r.userId,
        email: r.email,
        name: r.name,
        eventCount: Number(r.eventCount),
      })),
    };
  }

  async getFeatures(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    // Slide type distribution
    const slideTypes = await this.prisma.$queryRawUnsafe<
      Array<{ slideType: string; count: bigint }>
    >(
      `SELECT "slideType", COUNT(*) as count FROM "Slide"
       WHERE "createdAt" >= $1 GROUP BY "slideType" ORDER BY count DESC`,
      since,
    );

    // Theme popularity
    const themes = await this.prisma.$queryRawUnsafe<
      Array<{ name: string; count: bigint }>
    >(
      `SELECT t."displayName" as name, COUNT(*) as count FROM "Presentation" p
       JOIN "Theme" t ON p."themeId" = t."id"
       WHERE p."createdAt" >= $1 GROUP BY t."displayName" ORDER BY count DESC`,
      since,
    );

    // Export formats
    const exportFormats = await this.prisma.$queryRawUnsafe<
      Array<{ format: string; count: bigint }>
    >(
      `SELECT "format", COUNT(*) as count FROM "ExportJob"
       WHERE "createdAt" >= $1 AND "status" = 'COMPLETED' GROUP BY "format" ORDER BY count DESC`,
      since,
    );

    // Presentation types
    const presentationTypes = await this.prisma.$queryRawUnsafe<
      Array<{ type: string; count: bigint }>
    >(
      `SELECT "presentationType" as type, COUNT(*) as count FROM "Presentation"
       WHERE "createdAt" >= $1 GROUP BY "presentationType" ORDER BY count DESC`,
      since,
    );

    return {
      slideTypes: slideTypes.map((r) => ({
        type: r.slideType,
        count: Number(r.count),
      })),
      themes: themes.map((r) => ({ name: r.name, count: Number(r.count) })),
      exportFormats: exportFormats.map((r) => ({
        format: r.format,
        count: Number(r.count),
      })),
      presentationTypes: presentationTypes.map((r) => ({
        type: r.type,
        count: Number(r.count),
      })),
    };
  }

  async getGenerations(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    // Total generations and success rate
    const totals = await this.prisma.$queryRawUnsafe<
      Array<{ total: bigint; successes: bigint }>
    >(
      `SELECT COUNT(*) as total, SUM(CASE WHEN "success" THEN 1 ELSE 0 END) as successes
       FROM "GenerationMetric" WHERE "createdAt" >= $1`,
      since,
    );

    // Average duration by operation
    const avgDuration = await this.prisma.$queryRawUnsafe<
      Array<{ operation: string; avgMs: number }>
    >(
      `SELECT "operation", AVG("durationMs")::int as "avgMs"
       FROM "GenerationMetric" WHERE "createdAt" >= $1
       GROUP BY "operation" ORDER BY "avgMs" DESC`,
      since,
    );

    // Token usage totals
    const tokenUsage = await this.prisma.$queryRawUnsafe<
      Array<{
        totalInput: bigint;
        totalOutput: bigint;
        totalCacheRead: bigint;
        totalCacheWrite: bigint;
      }>
    >(
      `SELECT SUM("inputTokens") as "totalInput", SUM("outputTokens") as "totalOutput",
              SUM("cacheReadTokens") as "totalCacheRead", SUM("cacheWriteTokens") as "totalCacheWrite"
       FROM "GenerationMetric" WHERE "createdAt" >= $1`,
      since,
    );

    // Model breakdown
    const modelBreakdown = await this.prisma.$queryRawUnsafe<
      Array<{
        model: string;
        count: bigint;
        totalInput: bigint;
        totalOutput: bigint;
      }>
    >(
      `SELECT "model", COUNT(*) as count, SUM("inputTokens") as "totalInput", SUM("outputTokens") as "totalOutput"
       FROM "GenerationMetric" WHERE "createdAt" >= $1
       GROUP BY "model" ORDER BY count DESC`,
      since,
    );

    // Daily generation counts
    const dailyGenerations = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT DATE("createdAt") as date, COUNT(*) as count
       FROM "GenerationMetric" WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt") ORDER BY date`,
      since,
    );

    const total = Number(totals[0]?.total ?? 0);
    const successes = Number(totals[0]?.successes ?? 0);
    const usage = tokenUsage[0];

    // Cost estimate: Opus=$5/$25 per MTok, Sonnet=$3/$15, Haiku=$0.80/$4
    const costByModel = modelBreakdown.map((m) => {
      const inp = Number(m.totalInput);
      const out = Number(m.totalOutput);
      let inputRate = 5,
        outputRate = 25; // default Opus
      if (m.model.includes('sonnet')) {
        inputRate = 3;
        outputRate = 15;
      }
      if (m.model.includes('haiku')) {
        inputRate = 0.8;
        outputRate = 4;
      }
      return {
        model: m.model,
        cost: (inp * inputRate + out * outputRate) / 1_000_000,
      };
    });
    const totalCost = costByModel.reduce((sum, c) => sum + c.cost, 0);

    return {
      total,
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
      avgDuration: avgDuration.map((r) => ({
        operation: r.operation,
        avgMs: r.avgMs,
      })),
      tokenUsage: {
        totalInput: Number(usage?.totalInput ?? 0),
        totalOutput: Number(usage?.totalOutput ?? 0),
        totalCacheRead: Number(usage?.totalCacheRead ?? 0),
        totalCacheWrite: Number(usage?.totalCacheWrite ?? 0),
      },
      modelBreakdown: modelBreakdown.map((r) => ({
        model: r.model,
        count: Number(r.count),
        totalInput: Number(r.totalInput),
        totalOutput: Number(r.totalOutput),
      })),
      costEstimate: {
        byModel: costByModel,
        total: Math.round(totalCost * 100) / 100,
      },
      dailyGenerations: dailyGenerations.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    };
  }

  async getApiKeys(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    const keyUsage = await this.prisma.$queryRawUnsafe<
      Array<{ keyPrefix: string; name: string; count: bigint }>
    >(
      `SELECT ak."keyPrefix", ak."name", COUNT(ae."id") as count
       FROM "ApiKey" ak
       LEFT JOIN "ActivityEvent" ae ON ae."metadata"->>'keyPrefix' = ak."keyPrefix" AND ae."createdAt" >= $1
       GROUP BY ak."keyPrefix", ak."name"
       ORDER BY count DESC LIMIT 20`,
      since,
    );

    const totalKeys = await this.prisma.apiKey.count({
      where: { isRevoked: false },
    });
    const activeKeys = await this.prisma.apiKey.count({
      where: { isRevoked: false, lastUsedAt: { gte: since } },
    });

    return {
      totalKeys,
      activeKeys,
      keyUsage: keyUsage.map((r) => ({
        keyPrefix: r.keyPrefix,
        name: r.name,
        count: Number(r.count),
      })),
    };
  }

  async getFunnel(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    const signup = await this.prisma.user.count({
      where: { createdAt: { gte: since } },
    });

    const onboarded = await this.prisma.user.count({
      where: { createdAt: { gte: since }, onboardingCompleted: true },
    });

    const createdDeck = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(DISTINCT "userId") as count FROM "Presentation" WHERE "createdAt" >= $1`,
      since,
    );

    const generated = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(DISTINCT "userId") as count FROM "GenerationMetric" WHERE "createdAt" >= $1`,
      since,
    );

    const exported = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(DISTINCT p."userId") as count FROM "ExportJob" e
       JOIN "Presentation" p ON e."presentationId" = p."id"
       WHERE e."createdAt" >= $1 AND e."status" = 'COMPLETED'`,
      since,
    );

    return {
      steps: [
        { label: 'Signup', count: signup },
        { label: 'Onboarded', count: onboarded },
        { label: 'Created Deck', count: Number(createdDeck[0]?.count ?? 0) },
        { label: 'Generated', count: Number(generated[0]?.count ?? 0) },
        { label: 'Exported', count: Number(exported[0]?.count ?? 0) },
      ],
    };
  }
}
