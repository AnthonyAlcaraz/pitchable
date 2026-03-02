import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupCronService {
  private readonly logger = new Logger(BackupCronService.name);
  private readonly enabled: boolean;
  private readonly databaseUrl: string;
  private s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly retentionDays = 30;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get<string>('ENABLE_DB_BACKUPS', 'false') === 'true';
    this.databaseUrl = config.get<string>('DATABASE_URL', '')!;
    this.bucket = config.get<string>('S3_BUCKET', 'pitchable-documents')!;

    if (this.enabled) {
      const endpoint = config.get<string>('S3_ENDPOINT', '')!;
      const accessKey = config.get<string>('S3_ACCESS_KEY', '')!;
      const secretKey = config.get<string>('S3_SECRET_KEY', '')!;

      let endpointValid = false;
      try {
        new URL(endpoint);
        endpointValid = true;
      } catch {
        // not a valid URL
      }

      if (endpointValid && accessKey && secretKey) {
        this.s3 = new S3Client({
          endpoint,
          region: config.get<string>('S3_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          forcePathStyle: true,
        });
      } else {
        this.logger.warn('DB backups enabled but S3 not configured. Backups will be skipped.');
        this.enabled = false;
      }
    }
  }

  /** Run daily at 2 AM UTC */
  @Cron('0 2 * * *')
  async runBackup(): Promise<void> {
    if (!this.enabled || !this.s3) return;

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `backups/pitchable-${date}.sql.gz`;

    try {
      // Run pg_dump and capture stdout
      const { stdout } = await execFileAsync('pg_dump', [
        '--no-owner',
        '--no-acl',
        '--format=plain',
        this.databaseUrl,
      ], {
        maxBuffer: 500 * 1024 * 1024, // 500MB
        env: { ...process.env },
      });

      // Gzip the dump
      const chunks: Buffer[] = [];
      const gzip = createGzip({ level: 6 });
      const input = Readable.from(Buffer.from(stdout, 'utf-8'));
      const collectStream = new (await import('node:stream')).Writable({
        write(chunk: Buffer, _encoding: string, callback: () => void) {
          chunks.push(chunk);
          callback();
        },
      });

      await pipeline(input, gzip, collectStream);
      const compressed = Buffer.concat(chunks);

      // Upload to S3
      await (this.s3 as S3Client).send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: compressed,
          ContentType: 'application/gzip',
        }),
      );

      this.logger.log(`Backup uploaded: ${key} (${(compressed.length / 1024 / 1024).toFixed(1)} MB)`);

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch (err) {
      this.logger.error(
        `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.s3) return;

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.retentionDays);

      const listResult = await (this.s3 as S3Client).send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: 'backups/pitchable-',
        }),
      );

      const contents = listResult.Contents || [];
      const toDelete = contents
        .filter((obj) => obj.LastModified && obj.LastModified < cutoff && obj.Key)
        .map((obj) => ({ Key: obj.Key! }));

      if (toDelete.length > 0) {
        await (this.s3 as S3Client).send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: toDelete },
          }),
        );
        this.logger.log(`Cleaned up ${toDelete.length} old backup(s) (older than ${this.retentionDays} days)`);
      }
    } catch (err) {
      this.logger.warn(
        `Backup cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
