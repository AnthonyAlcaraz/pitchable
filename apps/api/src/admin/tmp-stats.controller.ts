import { Controller, Get, Query, ForbiddenException, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service.js';

const TMP_SECRET = 'ptchbl-tmp-2026';

@Controller('tmp-stats')
export class TmpStatsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

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
}
