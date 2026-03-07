import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const TMP_SECRET = 'ptchbl-tmp-2026';

function serialize(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === 'bigint' ? Number(v) : v));
}

@Controller('admin/tmp-stats')
export class TmpStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats(@Query('secret') secret: string) {
    if (secret !== TMP_SECRET) throw new ForbiddenException();

    try {
      const users = await this.prisma.$queryRawUnsafe(`SELECT count(*) as total FROM "User"`);
      const verified = await this.prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "User" WHERE "emailVerified" = true`);
      const google = await this.prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "User" WHERE "authProvider" = 'google'`);
      const subs = await this.prisma.$queryRawUnsafe(
        `SELECT s.tier, s.status, u.email, s."createdAt" as created, s."stripeSubscriptionId" as stripe FROM "Subscription" s JOIN "User" u ON s."userId" = u.id ORDER BY s."createdAt" DESC`,
      );
      const recentUsers = await this.prisma.$queryRawUnsafe(
        `SELECT email, name, tier, "createdAt" as created, "authProvider" as provider, "creditBalance" as credits, "emailVerified" as verified FROM "User" ORDER BY "createdAt" DESC LIMIT 20`,
      );
      const tiers = await this.prisma.$queryRawUnsafe(`SELECT tier, count(*) as count FROM "User" GROUP BY tier ORDER BY count DESC`);
      const exports = await this.prisma.$queryRawUnsafe(
        `SELECT format, count(*) as count FROM "ExportJob" WHERE status = 'COMPLETED' GROUP BY format ORDER BY count DESC`,
      );
      const decks = await this.prisma.$queryRawUnsafe(`SELECT count(*) as total FROM "Presentation"`);
      const decksWeek = await this.prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "Presentation" WHERE "createdAt" > NOW() - INTERVAL '7 days'`);

      return serialize({
        userSummary: { total: (users as any[])[0]?.total, verified: (verified as any[])[0]?.c, google: (google as any[])[0]?.c },
        tierDistribution: tiers,
        subscriptions: subs,
        recentUsers,
        exports,
        decks: { total: (decks as any[])[0]?.total, week: (decksWeek as any[])[0]?.c },
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}
