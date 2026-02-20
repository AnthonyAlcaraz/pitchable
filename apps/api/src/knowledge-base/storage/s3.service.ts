import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly available: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'pitchable-documents')!;
    this.endpoint = config.get<string>('S3_ENDPOINT', 'http://localhost:9000')!;

    // Validate that the endpoint is a real URL (not a placeholder like "not-set")
    let endpointValid = false;
    try {
      new URL(this.endpoint);
      endpointValid = true;
    } catch {
      // not a valid URL
    }

    const accessKey = config.get<string>('S3_ACCESS_KEY', 'minioadmin')!;
    const secretKey = config.get<string>('S3_SECRET_KEY', 'minioadmin')!;

    if (endpointValid && accessKey !== 'not-set' && secretKey !== 'not-set') {
      this.s3 = new S3Client({
        endpoint: this.endpoint,
        region: config.get<string>('S3_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true, // REQUIRED for MinIO / R2
      });
      this.available = true;
    } else {
      this.logger.warn(
        'S3 not configured (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY missing or invalid). ' +
        'File uploads will fail until S3 is configured.',
      );
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getEndpoint(): string {
    return this.endpoint;
  }

  // Return type widened: nodenext moduleResolution cannot trace .send()
  // through @smithy/smithy-client class hierarchy in @aws-sdk/client-s3
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requireS3(): any {
    if (!this.s3) {
      throw new Error('S3 is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY.');
    }
    return this.s3;
  }

  async onModuleInit(): Promise<void> {
    if (!this.available) return;
    try {
      await this.requireS3().send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket "${this.bucket}" exists`);
    } catch {
      try {
        this.logger.log(`Creating S3 bucket "${this.bucket}"...`);
        await this.requireS3().send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`S3 bucket "${this.bucket}" created`);
      } catch (createErr) {
        this.logger.warn(
          `Could not verify/create S3 bucket "${this.bucket}": ${createErr instanceof Error ? createErr.message : String(createErr)}`,
        );
      }
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.requireS3().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
      { abortSignal: AbortSignal.timeout(10_000) },
    );
    return key;
  }

  async getBuffer(key: string): Promise<Buffer> {
    const response = await this.requireS3().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body;
    if (!stream) throw new Error(`Empty response for key: ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.requireS3(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    await this.requireS3().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
