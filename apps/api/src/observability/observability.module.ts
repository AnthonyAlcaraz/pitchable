import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { GenerationMetricsService } from './generation-metrics.service.js';
import { ObservabilityCleanupCron } from './cleanup.cron.js';

@Global()
@Module({
  providers: [ActivityService, GenerationMetricsService, ObservabilityCleanupCron],
  exports: [ActivityService, GenerationMetricsService],
})
export class ObservabilityModule {}
