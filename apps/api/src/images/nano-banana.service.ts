import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ──────────────────────────────────────────────

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string | string[] | null;
  error: string | null;
}

// ── Service ─────────────────────────────────────────────────

/**
 * Image generation via Replicate API (google/imagen-3).
 *
 * This matches the proven z4 presentation skill pipeline:
 * Replicate (Imagen 3 / Nano Banana Pro) → download PNG → base64.
 */
@Injectable()
export class NanoBananaService {
  private readonly logger = new Logger(NanoBananaService.name);
  private readonly apiToken: string | undefined;
  private readonly imgurClientId: string | undefined;
  private readonly model = 'google/imagen-3';
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly timeoutMs = 180_000;
  private readonly pollIntervalMs = 3_000;

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>('REPLICATE_API_TOKEN');
    this.imgurClientId = this.configService.get<string>('IMGUR_CLIENT_ID');

    if (!this.apiToken) {
      this.logger.warn(
        'REPLICATE_API_TOKEN is not set — NanoBananaService will not be operational',
      );
    } else {
      this.logger.log('NanoBananaService configured with Replicate API (Imagen 3)');
    }
  }

  get isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Generate an image via Replicate's Imagen 3 model.
   * Returns base64 + mimeType (same interface as before for processor compatibility).
   */
  async generateImage(
    prompt: string,
    negativePrompt: string,
  ): Promise<{ base64: string; mimeType: string }> {
    if (!this.apiToken) {
      throw new Error(
        'NanoBananaService is not configured: REPLICATE_API_TOKEN is missing',
      );
    }

    this.logger.log(
      `Generating image via Replicate (Imagen 3): "${prompt.slice(0, 100)}..."`,
    );

    // 1. Create prediction
    const prediction = await this.createPrediction(prompt, negativePrompt);

    // 2. Poll until complete
    const completed = await this.pollPrediction(prediction.id);

    if (completed.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${completed.error ?? 'unknown error'}`);
    }

    // 3. Extract image URL from output
    const imageUrl = this.extractImageUrl(completed.output);
    if (!imageUrl) {
      throw new Error('Replicate returned no image URL in output');
    }

    this.logger.log(`Image generated, downloading from: ${imageUrl.slice(0, 80)}...`);

    // 4. Download image and convert to base64
    const { base64, mimeType } = await this.downloadAsBase64(imageUrl);

    this.logger.log(
      `Image downloaded (mimeType: ${mimeType}, base64 length: ${base64.length})`,
    );

    return { base64, mimeType };
  }

  /**
   * Generate image and return the direct URL (skip base64 conversion).
   * Useful when we want to upload the URL directly to Imgur.
   */
  async generateImageUrl(
    prompt: string,
    negativePrompt: string,
  ): Promise<string> {
    if (!this.apiToken) {
      throw new Error(
        'NanoBananaService is not configured: REPLICATE_API_TOKEN is missing',
      );
    }

    const prediction = await this.createPrediction(prompt, negativePrompt);
    const completed = await this.pollPrediction(prediction.id);

    if (completed.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${completed.error ?? 'unknown error'}`);
    }

    const imageUrl = this.extractImageUrl(completed.output);
    if (!imageUrl) {
      throw new Error('Replicate returned no image URL in output');
    }

    return imageUrl;
  }

  // ── Private ────────────────────────────────────────────────

  private async createPrediction(
    prompt: string,
    negativePrompt: string,
  ): Promise<ReplicatePrediction> {
    const body = {
      version: undefined as undefined,
      input: {
        prompt: negativePrompt
          ? `${prompt}\n\nAVOID: ${negativePrompt}`
          : prompt,
        aspect_ratio: '16:9',
        output_format: 'png',
        safety_filter_level: 'block_only_high',
      },
    };

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}/predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Replicate API error ${response.status}: ${errorBody}`);
    }

    return (await response.json()) as ReplicatePrediction;
  }

  private async pollPrediction(predictionId: string): Promise<ReplicatePrediction> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const response = await fetch(
        `${this.baseUrl}/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Replicate poll error ${response.status}: ${errorBody}`);
      }

      const prediction = (await response.json()) as ReplicatePrediction;

      if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
        return prediction;
      }

      this.logger.debug(`Prediction ${predictionId} status: ${prediction.status}, polling...`);
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }

    throw new Error(`Replicate prediction timed out after ${this.timeoutMs}ms`);
  }

  private extractImageUrl(output: string | string[] | null): string | null {
    if (!output) return null;
    if (typeof output === 'string') return output;
    if (Array.isArray(output) && output.length > 0) return output[0];
    return null;
  }

  private async downloadAsBase64(
    imageUrl: string,
  ): Promise<{ base64: string; mimeType: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(imageUrl, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return { base64, mimeType: contentType };
    } finally {
      clearTimeout(timeout);
    }
  }
}
