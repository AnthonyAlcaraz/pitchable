import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ──────────────────────────────────────────────

interface ImgurUploadResponse {
  data: {
    id: string;
    link: string;
    deletehash: string;
  };
  success: boolean;
  status: number;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ImgurService {
  private readonly logger = new Logger(ImgurService.name);
  private readonly clientId: string;
  private readonly uploadUrl = 'https://api.imgur.com/3/image';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('IMGUR_CLIENT_ID');
  }

  async uploadFromUrl(imageUrl: string, title?: string): Promise<string> {
    this.logger.log(`Downloading image from: ${imageUrl.slice(0, 100)}`);

    const downloadResponse = await fetch(imageUrl);

    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to download image: ${downloadResponse.status} ${downloadResponse.statusText}`,
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.uploadFromBuffer(buffer, title);
  }

  async uploadFromBuffer(buffer: Buffer, title?: string): Promise<string> {
    const base64Data = buffer.toString('base64');

    this.logger.log(
      `Uploading image to Imgur (${Math.round(buffer.length / 1024)} KB)`,
    );

    const body: Record<string, string> = {
      image: base64Data,
      type: 'base64',
    };

    if (title) {
      body.title = title;
    }

    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${this.clientId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Imgur upload failed: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Imgur API error ${response.status}: ${errorBody}`,
      );
    }

    const data = (await response.json()) as ImgurUploadResponse;

    if (!data.success) {
      throw new Error(`Imgur upload returned success=false (status ${data.status})`);
    }

    this.logger.log(`Image uploaded to Imgur: ${data.data.link}`);
    return data.data.link;
  }
}
