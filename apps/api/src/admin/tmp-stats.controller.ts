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
      this.prisma.$queryRawUnsafe<Array<{ total: bigint; verified: bigint; google: bigint }>>(
        `SELECT count(*) as total, count(*) FILTER (WHERE "emailVerified" = true) as verified, count(*) FILTER (WHERE "authProvider" = 'google') as google FROM "User"`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ plan: string; status: string; email: string; created: Date; stripe: string }>>(
        `SELECT s.plan, s.status, u.email, s."createdAt" as created, s."stripeSubscriptionId" as stripe FROM "Subscription" s JOIN "User" u ON s."userId" = u.id ORDER BY s."createdAt" DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ email: string; name: string; plan: string; created: Date; provider: string; credits: number; verified: boolean }>>(
        `SELECT email, name, plan, "createdAt" as created, "authProvider" as provider, "creditBalance" as credits, "emailVerified" as verified FROM "User" ORDER BY "createdAt" DESC LIMIT 20`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ plan: string; count: bigint }>>(
        `SELECT plan, count(*) as count FROM "User" GROUP BY plan ORDER BY count DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ format: string; count: bigint }>>(
        `SELECT format, count(*) as count FROM "ExportJob" WHERE status = 'COMPLETED' GROUP BY format ORDER BY count DESC`,
      ),
      this.prisma.$queryRawUnsafe<Array<{ total: bigint; week: bigint; today: bigint }>>(
        `SELECT count(*) as total, count(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as week, count(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as today FROM "Presentation"`,
      ),
    ]);

    return {
      userSummary: { total: Number(users[0].total), verified: Number(users[0].verified), google: Number(users[0].google) },
      planDistribution: plans.map(p => ({ plan: p.plan, count: Number(p.count) })),
      subscriptions: subs,
      recentUsers: recentUsers,
      exports: exports.map(e => ({ format: e.format, count: Number(e.count) })),
      decks: { total: Number(decks[0].total), lastWeek: Number(decks[0].week), today: Number(decks[0].today) },
    };
  }
}
