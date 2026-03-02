import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { GenerationMetricsService } from './generation-metrics.service.js';

@Global()
@Module({
  providers: [ActivityService, GenerationMetricsService],
  exports: [ActivityService, GenerationMetricsService],
})
export class ObservabilityModule {}
