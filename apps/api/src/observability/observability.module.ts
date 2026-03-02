import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { GenerationMetricsService } from './generation-metrics.service.js';
import { ObservabilityCleanupCron } from './cleanup.cron.js';
import { BackupCronService } from '../common/backup.cron.js';

// Only instantiate BackupCronService when backups are enabled.
// This avoids loading @aws-sdk/client-s3 + registering the cron when not needed.
const backupProviders = process.env['ENABLE_DB_BACKUPS'] === 'true' ? [BackupCronService] : [];

@Global()
@Module({
  providers: [ActivityService, GenerationMetricsService, ObservabilityCleanupCron, ...backupProviders],
  exports: [ActivityService, GenerationMetricsService],
})
export class ObservabilityModule {}
