import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { GenerationMetricsService } from './generation-metrics.service.js';
import { ObservabilityCleanupCron } from './cleanup.cron.js';
import { GenerationRatingService } from './generation-rating.service.js';
import { GenerationRatingController } from './generation-rating.controller.js';
import { BackupCronService } from '../common/backup.cron.js';

// Only instantiate BackupCronService when backups are enabled.
// This avoids loading @aws-sdk/client-s3 + registering the cron when not needed.
const backupProviders = process.env['ENABLE_DB_BACKUPS'] === 'true' ? [BackupCronService] : [];

@Global()
@Module({
  controllers: [GenerationRatingController],
  providers: [ActivityService, GenerationMetricsService, GenerationRatingService, ObservabilityCleanupCron, ...backupProviders],
  exports: [ActivityService, GenerationMetricsService, GenerationRatingService],
})
export class ObservabilityModule {}
