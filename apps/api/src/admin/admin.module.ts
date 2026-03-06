import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { TmpStatsController } from './tmp-stats.controller.js';

@Module({
  controllers: [AdminAnalyticsController, TmpStatsController],
  providers: [AdminAnalyticsService],
})
export class AdminModule {}
