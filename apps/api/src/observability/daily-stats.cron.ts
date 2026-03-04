import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';

interface DailyStatsData {
  dateLabel: string;
  views: { yesterday: number; dayBefore: number };
  signups: { yesterday: number; dayBefore: number };
  decks: { yesterday: number; dayBefore: number };
  exports: { yesterday: number; dayBefore: number };
  totalUsers: number;
  totalDecks: number;
  totalViews: number;
  verifiedEmails: number;
  payingCustomers: number;
  planDistribution: { tier: string; count: number }[];
  topIpRanges: { range: string; count: number }[];
}

@Injectable()
export class DailyStatsCron {
  private readonly logger = new Logger(DailyStatsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 8 * * *')
  async sendDailyStats() {
    const recipient = this.configService.get<string>('DAILY_STATS_EMAIL');
    if (!recipient) return;

    try {
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const yesterday = new Date(today.getTime() - 86400000);
      const dayBefore = new Date(today.getTime() - 2 * 86400000);

      const data = await this.gatherStats(yesterday, dayBefore, today);
      const html = this.buildStatsEmailHtml(data);

      await this.emailService.sendEmail({
        to: recipient,
        subject: `Pitchable Daily Stats — ${data.dateLabel}`,
        html,
      });

      this.logger.log(`Daily stats email sent to ${recipient}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send daily stats: ${msg}`);
    }
  }
  async sendDailyStatsTo(email: string) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = new Date(today.getTime() - 86400000);
    const dayBefore = new Date(today.getTime() - 2 * 86400000);
    const data = await this.gatherStats(yesterday, dayBefore, today);
    const html = this.buildStatsEmailHtml(data);
    await this.emailService.sendEmail({ to: email, subject: `Pitchable Daily Stats — ${data.dateLabel}`, html });
    this.logger.log(`Daily stats email sent to ${email}`);
  }

  private async gatherStats(yesterday: Date, dayBefore: Date, today: Date): Promise<DailyStatsData> {
    const dateLabel = yesterday.toISOString().slice(0, 10);

    const [
      viewsYesterday,
      viewsDayBefore,
      signupsYesterday,
      signupsDayBefore,
      decksYesterday,
      decksDayBefore,
      exportsYesterday,
      exportsDayBefore,
      totalUsers,
      totalDecks,
      totalViews,
      verifiedEmails,
      payingCustomers,
      planDistribution,
      topIpRanges,
    ] = await Promise.all([
      this.prisma.presentationView.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.presentationView.count({ where: { createdAt: { gte: dayBefore, lt: yesterday } } }),
      this.prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: dayBefore, lt: yesterday } } }),
      this.prisma.presentation.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.presentation.count({ where: { createdAt: { gte: dayBefore, lt: yesterday } } }),
      this.prisma.exportJob.count({ where: { status: 'COMPLETED', createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.exportJob.count({ where: { status: 'COMPLETED', createdAt: { gte: dayBefore, lt: yesterday } } }),
      this.prisma.user.count(),
      this.prisma.presentation.count(),
      this.prisma.presentationView.count(),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { tier: { not: 'FREE' } } }),
      this.prisma.$queryRaw<{ tier: string; count: bigint }[]>`
        SELECT "tier", COUNT(*)::bigint as count FROM "User" GROUP BY "tier" ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ range: string; count: bigint }[]>`
        SELECT
          SUBSTRING("registrationIp" FROM '^([0-9]+\.[0-9]+\.[0-9]+)\.')  as range,
          COUNT(*)::bigint as count
        FROM "User"
        WHERE "registrationIp" IS NOT NULL
        GROUP BY range
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return {
      dateLabel,
      views: { yesterday: viewsYesterday, dayBefore: viewsDayBefore },
      signups: { yesterday: signupsYesterday, dayBefore: signupsDayBefore },
      decks: { yesterday: decksYesterday, dayBefore: decksDayBefore },
      exports: { yesterday: exportsYesterday, dayBefore: exportsDayBefore },
      totalUsers,
      totalDecks,
      totalViews,
      verifiedEmails,
      payingCustomers,
      planDistribution: planDistribution.map((r) => ({ tier: r.tier, count: Number(r.count) })),
      topIpRanges: topIpRanges.map((r) => ({ range: r.range, count: Number(r.count) })),
    };
  }

  private formatDelta(yesterday: number, dayBefore: number): string {
    if (dayBefore === 0) {
      return yesterday > 0
        ? '<span style="color:#22c55e;">NEW</span>'
        : '<span style="color:#64748b;">—</span>';
    }
    const pct = ((yesterday - dayBefore) / dayBefore) * 100;
    const sign = pct >= 0 ? '+' : '';
    const color = pct >= 0 ? '#22c55e' : '#ef4444';
    return `<span style="color:${color};">${sign}${pct.toFixed(0)}%</span>`;
  }

  private formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  private buildStatsEmailHtml(data: DailyStatsData): string {
    const totalPlanUsers = data.planDistribution.reduce((s, r) => s + r.count, 0);

    const planRows = data.planDistribution
      .map((r) => {
        const pct = totalPlanUsers > 0 ? ((r.count / totalPlanUsers) * 100).toFixed(1) : '0';
        return `
          <tr>
            <td style="padding:6px 12px;color:#cbd5e1;font-size:13px;border-bottom:1px solid #334155;">${r.tier}</td>
            <td style="padding:6px 12px;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155;text-align:right;">${this.formatNumber(r.count)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #334155;">
              <div style="background:#334155;border-radius:4px;height:8px;width:100%;">
                <div style="background:#0ea5e9;border-radius:4px;height:8px;width:${pct}%;"></div>
              </div>
            </td>
            <td style="padding:6px 12px;color:#94a3b8;font-size:12px;border-bottom:1px solid #334155;text-align:right;">${pct}%</td>
          </tr>`;
      })
      .join('');

    const ipRows = data.topIpRanges
      .map(
        (r) => `
          <tr>
            <td style="padding:4px 12px;color:#cbd5e1;font-size:13px;font-family:monospace;border-bottom:1px solid #334155;">${r.range}.*</td>
            <td style="padding:4px 12px;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155;text-align:right;">${this.formatNumber(r.count)}</td>
          </tr>`,
      )
      .join('');

    const metricRow = (label: string, yesterday: number, dayBefore: number, cumulative?: number) => `
      <tr>
        <td style="padding:8px 12px;color:#cbd5e1;font-size:14px;border-bottom:1px solid #334155;">${label}</td>
        <td style="padding:8px 12px;color:#f1f5f9;font-size:14px;font-weight:600;border-bottom:1px solid #334155;text-align:right;">${this.formatNumber(yesterday)}</td>
        <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #334155;text-align:right;">${this.formatDelta(yesterday, dayBefore)}</td>
        <td style="padding:8px 12px;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right;">${cumulative !== undefined ? this.formatNumber(cumulative) : '—'}</td>
      </tr>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:1.5px;text-transform:uppercase;">PITCHABLE</div>
      <h1 style="font-size:22px;font-weight:700;color:#f1f5f9;margin:12px 0 4px 0;">Daily Stats — ${data.dateLabel}</h1>
    </div>

    <!-- Activity metrics -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="padding:10px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:left;letter-spacing:1px;">Metric</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;letter-spacing:1px;">Yesterday</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;letter-spacing:1px;">Delta</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;letter-spacing:1px;">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          ${metricRow('Views', data.views.yesterday, data.views.dayBefore, data.totalViews)}
          ${metricRow('New Signups', data.signups.yesterday, data.signups.dayBefore, data.totalUsers)}
          ${metricRow('Decks Created', data.decks.yesterday, data.decks.dayBefore, data.totalDecks)}
          ${metricRow('Exports', data.exports.yesterday, data.exports.dayBefore)}
        </tbody>
      </table>
    </div>

    <!-- Summary cards -->
    <div style="margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
        <tr>
          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <div style="color:#0ea5e9;font-size:24px;font-weight:700;">${this.formatNumber(data.verifiedEmails)}</div>
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Verified</div>
          </td>
          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <div style="color:#22c55e;font-size:24px;font-weight:700;">${this.formatNumber(data.payingCustomers)}</div>
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Paying</div>
          </td>
          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <div style="color:#f1f5f9;font-size:24px;font-weight:700;">${this.formatNumber(data.totalUsers)}</div>
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Total Users</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Plan distribution -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <div style="padding:12px;background:#0f172a;"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Plan Distribution</span></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tbody>${planRows}</tbody>
      </table>
    </div>

    <!-- Top IP ranges -->
    ${data.topIpRanges.length > 0 ? `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <div style="padding:12px;background:#0f172a;"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Top IP Ranges</span></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tbody>${ipRows}</tbody>
      </table>
    </div>` : ''}

    <div style="text-align:center;margin-top:24px;">
      <p style="color:#64748b;font-size:12px;margin:0;">Pitchable &middot; Daily Stats Report</p>
    </div>
  </div>
</body>
</html>`;
  }
}
