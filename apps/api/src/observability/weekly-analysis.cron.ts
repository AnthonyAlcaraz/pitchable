import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service.js';

interface DayMetrics {
  date: string;
  views: number;
  signups: number;
  decks: number;
  exports: number;
}

interface WeeklyData {
  weekLabel: string;
  thisWeek: DayMetrics[];
  prevWeek: DayMetrics[];
  totals: { thisWeek: DayMetrics; prevWeek: DayMetrics };
  cumulative: { users: number; decks: number; views: number; verifiedEmails: number; payingCustomers: number };
  planDistribution: { tier: string; count: number }[];
}

@Injectable()
export class WeeklyAnalysisCron {
  private readonly logger = new Logger(WeeklyAnalysisCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Every Monday at 8 AM UTC */
  @Cron('0 8 * * 1')
  async sendWeeklyAnalysis() {
    const recipient = this.configService.get<string>('DAILY_STATS_EMAIL');
    if (!recipient) return;

    try {
      const data = await this.gatherWeeklyStats();
      const analysis = await this.generateAnalysis(data);
      const html = this.buildWeeklyEmailHtml(data, analysis);

      const resendKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendKey) {
        this.logger.warn('RESEND_API_KEY not set — skipping weekly analysis email');
        return;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Pitchable <onboarding@resend.dev>',
          to: [recipient],
          subject: 'Pitchable Weekly Analysis — ' + data.weekLabel,
          html,
        }),
      });
      const result = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        this.logger.error('Resend API error: ' + JSON.stringify(result));
        return;
      }

      this.logger.log('Weekly analysis email sent to ' + recipient + ' (id: ' + result.id + ')');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send weekly analysis: ' + msg);
    }
  }

  private async gatherWeeklyStats(): Promise<WeeklyData> {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const thisWeekStart = new Date(today.getTime() - 7 * 86400000);
    const prevWeekStart = new Date(today.getTime() - 14 * 86400000);

    const weekLabel = thisWeekStart.toISOString().slice(0, 10) + ' to ' + new Date(today.getTime() - 86400000).toISOString().slice(0, 10);

    const dailyQuery = async (start: Date, days: number): Promise<DayMetrics[]> => {
      const results: DayMetrics[] = [];
      for (let i = 0; i < days; i++) {
        const dayStart = new Date(start.getTime() + i * 86400000);
        const dayEnd = new Date(start.getTime() + (i + 1) * 86400000);
        const [views, signups, decks, exports] = await Promise.all([
          this.prisma.presentationView.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          this.prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          this.prisma.presentation.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          this.prisma.exportJob.count({ where: { status: 'COMPLETED', createdAt: { gte: dayStart, lt: dayEnd } } }),
        ]);
        results.push({ date: dayStart.toISOString().slice(0, 10), views, signups, decks, exports });
      }
      return results;
    };

    const [thisWeek, prevWeek, totalUsers, totalDecks, totalViews, verifiedEmails, payingCustomers, planDistribution] = await Promise.all([
      dailyQuery(thisWeekStart, 7),
      dailyQuery(prevWeekStart, 7),
      this.prisma.user.count(),
      this.prisma.presentation.count(),
      this.prisma.presentationView.count(),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { tier: { not: 'FREE' } } }),
      this.prisma.$queryRaw<{ tier: string; count: bigint }[]>`
        SELECT "tier", COUNT(*)::bigint as count FROM "User" GROUP BY "tier" ORDER BY count DESC
      `,
    ]);

    const sum = (days: DayMetrics[]): DayMetrics => ({
      date: '',
      views: days.reduce((s, d) => s + d.views, 0),
      signups: days.reduce((s, d) => s + d.signups, 0),
      decks: days.reduce((s, d) => s + d.decks, 0),
      exports: days.reduce((s, d) => s + d.exports, 0),
    });

    return {
      weekLabel,
      thisWeek,
      prevWeek,
      totals: { thisWeek: sum(thisWeek), prevWeek: sum(prevWeek) },
      cumulative: { users: totalUsers, decks: totalDecks, views: totalViews, verifiedEmails, payingCustomers },
      planDistribution: planDistribution.map((r) => ({ tier: r.tier, count: Number(r.count) })),
    };
  }

  private async generateAnalysis(data: WeeklyData): Promise<string> {
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set — skipping AI analysis');
      return 'AI analysis unavailable (ANTHROPIC_API_KEY not configured).';
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `You are a concise SaaS metrics analyst for Pitchable, an AI presentation builder (early stage).

Analyze this week's data and write 3-5 bullet points (HTML <li> tags) highlighting:
- Key trends (growth/decline in signups, views, decks, exports)
- Week-over-week changes worth noting
- Conversion signals (signups to verified, free to paid)
- Any patterns in daily activity (weekday vs weekend, spikes)
- One actionable recommendation

THIS WEEK (${data.weekLabel}):
${data.thisWeek.map((d) => d.date + ': ' + d.views + ' views, ' + d.signups + ' signups, ' + d.decks + ' decks, ' + d.exports + ' exports').join('\n')}
Totals: ${data.totals.thisWeek.views} views, ${data.totals.thisWeek.signups} signups, ${data.totals.thisWeek.decks} decks, ${data.totals.thisWeek.exports} exports

PREVIOUS WEEK:
${data.prevWeek.map((d) => d.date + ': ' + d.views + ' views, ' + d.signups + ' signups, ' + d.decks + ' decks, ' + d.exports + ' exports').join('\n')}
Totals: ${data.totals.prevWeek.views} views, ${data.totals.prevWeek.signups} signups, ${data.totals.prevWeek.decks} decks, ${data.totals.prevWeek.exports} exports

CUMULATIVE: ${data.cumulative.users} users (${data.cumulative.verifiedEmails} verified, ${data.cumulative.payingCustomers} paying), ${data.cumulative.decks} decks, ${data.cumulative.views} views

PLAN DISTRIBUTION: ${data.planDistribution.map((p) => p.tier + ': ' + p.count).join(', ')}

Return ONLY the <li> tags, no wrapper <ul>. Keep each bullet under 30 words. Be specific with numbers, not vague.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : 'Analysis generation failed.';
  }

  private formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  private formatWoWDelta(thisWeek: number, prevWeek: number): string {
    if (prevWeek === 0) {
      return thisWeek > 0
        ? '<span style="color:#22c55e;">NEW</span>'
        : '<span style="color:#64748b;">—</span>';
    }
    const pct = ((thisWeek - prevWeek) / prevWeek) * 100;
    const sign = pct >= 0 ? '+' : '';
    const color = pct >= 0 ? '#22c55e' : '#ef4444';
    return '<span style="color:' + color + ';">' + sign + pct.toFixed(0) + '%</span>';
  }

  private buildWeeklyEmailHtml(data: WeeklyData, analysis: string): string {
    const tw = data.totals.thisWeek;
    const pw = data.totals.prevWeek;

    const metricRow = (label: string, thisW: number, prevW: number) =>
      '<tr>' +
      '<td style="padding:8px 12px;color:#cbd5e1;font-size:14px;border-bottom:1px solid #334155;">' + label + '</td>' +
      '<td style="padding:8px 12px;color:#f1f5f9;font-size:14px;font-weight:600;border-bottom:1px solid #334155;text-align:right;">' + this.formatNumber(thisW) + '</td>' +
      '<td style="padding:8px 12px;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right;">' + this.formatNumber(prevW) + '</td>' +
      '<td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #334155;text-align:right;">' + this.formatWoWDelta(thisW, prevW) + '</td>' +
      '</tr>';

    const dailyRows = data.thisWeek
      .map((d) => {
        const dayName = new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
        return '<tr>' +
          '<td style="padding:4px 12px;color:#94a3b8;font-size:12px;border-bottom:1px solid #334155;">' + dayName + ' ' + d.date.slice(5) + '</td>' +
          '<td style="padding:4px 12px;color:#f1f5f9;font-size:12px;border-bottom:1px solid #334155;text-align:right;">' + d.views + '</td>' +
          '<td style="padding:4px 12px;color:#f1f5f9;font-size:12px;border-bottom:1px solid #334155;text-align:right;">' + d.signups + '</td>' +
          '<td style="padding:4px 12px;color:#f1f5f9;font-size:12px;border-bottom:1px solid #334155;text-align:right;">' + d.decks + '</td>' +
          '<td style="padding:4px 12px;color:#f1f5f9;font-size:12px;border-bottom:1px solid #334155;text-align:right;">' + d.exports + '</td>' +
          '</tr>';
      })
      .join('');

    return '<!DOCTYPE html>' +
'<html>' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Inter,Helvetica,Arial,sans-serif;">' +
'  <div style="max-width:640px;margin:0 auto;padding:32px 24px;">' +
'    <div style="text-align:center;margin-bottom:24px;">' +
'      <div style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:1.5px;text-transform:uppercase;">PITCHABLE</div>' +
'      <h1 style="font-size:22px;font-weight:700;color:#f1f5f9;margin:12px 0 4px 0;">Weekly Analysis</h1>' +
'      <p style="color:#94a3b8;font-size:13px;margin:0;">' + data.weekLabel + '</p>' +
'    </div>' +

    // AI Analysis section
'    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:16px;">' +
'      <div style="display:flex;align-items:center;margin-bottom:12px;">' +
'        <span style="background:#8b5cf6;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:1px;">AI ANALYSIS</span>' +
'        <span style="color:#64748b;font-size:11px;margin-left:8px;">Sonnet 4.6</span>' +
'      </div>' +
'      <ul style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">' +
         analysis +
'      </ul>' +
'    </div>' +

    // Week-over-week summary
'    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:16px;">' +
'      <div style="padding:12px;background:#0f172a;"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Week-over-Week</span></div>' +
'      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
'        <thead><tr style="background:#0f172a;">' +
'          <th style="padding:8px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:left;">Metric</th>' +
'          <th style="padding:8px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;">This Week</th>' +
'          <th style="padding:8px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;">Prev Week</th>' +
'          <th style="padding:8px 12px;color:#64748b;font-size:11px;text-transform:uppercase;text-align:right;">Change</th>' +
'        </tr></thead>' +
'        <tbody>' +
           metricRow('Views', tw.views, pw.views) +
           metricRow('Signups', tw.signups, pw.signups) +
           metricRow('Decks', tw.decks, pw.decks) +
           metricRow('Exports', tw.exports, pw.exports) +
'        </tbody>' +
'      </table>' +
'    </div>' +

    // Daily breakdown
'    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:16px;">' +
'      <div style="padding:12px;background:#0f172a;"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Daily Breakdown</span></div>' +
'      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
'        <thead><tr style="background:#0f172a;">' +
'          <th style="padding:6px 12px;color:#64748b;font-size:10px;text-transform:uppercase;text-align:left;">Day</th>' +
'          <th style="padding:6px 12px;color:#64748b;font-size:10px;text-transform:uppercase;text-align:right;">Views</th>' +
'          <th style="padding:6px 12px;color:#64748b;font-size:10px;text-transform:uppercase;text-align:right;">Signups</th>' +
'          <th style="padding:6px 12px;color:#64748b;font-size:10px;text-transform:uppercase;text-align:right;">Decks</th>' +
'          <th style="padding:6px 12px;color:#64748b;font-size:10px;text-transform:uppercase;text-align:right;">Exports</th>' +
'        </tr></thead>' +
'        <tbody>' + dailyRows + '</tbody>' +
'      </table>' +
'    </div>' +

    // Cumulative summary
'    <div style="margin-bottom:16px;">' +
'      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">' +
'        <tr>' +
'          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
'            <div style="color:#0ea5e9;font-size:24px;font-weight:700;">' + this.formatNumber(data.cumulative.users) + '</div>' +
'            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Total Users</div>' +
'          </td>' +
'          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
'            <div style="color:#22c55e;font-size:24px;font-weight:700;">' + this.formatNumber(data.cumulative.payingCustomers) + '</div>' +
'            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Paying</div>' +
'          </td>' +
'          <td style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
'            <div style="color:#f1f5f9;font-size:24px;font-weight:700;">' + this.formatNumber(data.cumulative.verifiedEmails) + '</div>' +
'            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Verified</div>' +
'          </td>' +
'        </tr>' +
'      </table>' +
'    </div>' +

'    <div style="text-align:center;margin-top:24px;">' +
'      <p style="color:#64748b;font-size:12px;margin:0;">Pitchable &middot; Weekly Analysis Report</p>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
  }
}
