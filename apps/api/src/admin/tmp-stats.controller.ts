import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const TMP_SECRET = 'ptchbl-tmp-2026';

@Controller('admin/tmp-stats')
export class TmpStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats(@Query('secret') secret: string) {
    if (secret !== TMP_SECRET) throw new ForbiddenException();

    const [users, subs, recentUsers, plans, exports, decks] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ total: string; verified: string; google: string }>>(
        `SELECT count(*)::int as total, count(*) FILTER (WHERE "emailVerified" = true)::int as verified, count(*) FILTER (WHERE "authProvider" = 'google')::int as google FROM "User"`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ plan: string; status: string; email: string; created: Date; stripe: string }>>(
        `SELECT s.plan, s.status, u.email, s."createdAt" as created, s."stripeSubscriptionId" as stripe FROM "Subscription" s JOIN "User" u ON s."userId" = u.id ORDER BY s."createdAt" DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ email: string; name: string; plan: string; created: Date; provider: string; credits: number; verified: boolean }>>(
        `SELECT email, name, plan, "createdAt" as created, "authProvider" as provider, "creditBalance" as credits, "emailVerified" as verified FROM "User" ORDER BY "createdAt" DESC LIMIT 20`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ plan: string; count: string }>>(
        `SELECT plan, count(*)::int as count FROM "User" GROUP BY plan ORDER BY count DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ format: string; count: string }>>(
        `SELECT format, count(*)::int as count FROM "ExportJob" WHERE status = 'COMPLETED' GROUP BY format ORDER BY count DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ total: string; week: string; today: string }>>(
        `SELECT count(*)::int as total, count(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int as week, count(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours')::int as today FROM "Presentation"`,
      ),
    ]);

    return {
      userSummary: users[0],
      planDistribution: plans,
      subscriptions: subs,
      recentUsers: recentUsers,
      exports: exports,
      decks: decks[0],
    };
  }
}
