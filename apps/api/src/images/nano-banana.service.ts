import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ──────────────────────────────────────────────

interface GeminiImagePart {
  inline_data: {
    mime_type: string;
    data: string;
  };
}

interface GeminiTextPart {
  text: string;
}

type GeminiPart = GeminiImagePart | GeminiTextPart;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class NanoBananaService {
  private readonly logger = new Logger(NanoBananaService.name);
  private readonly apiKey: string | undefined;
  private readonly model = 'gemini-3-pro-image-preview';
  private readonly baseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly timeoutMs = 120_000;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — NanoBananaService will not be operational',
      );
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateImage(
    prompt: string,
    negativePrompt: string,
  ): Promise<{ base64: string; mimeType: string }> {
    if (!this.apiKey) {
      throw new Error(
        'NanoBananaService is not configured: GEMINI_API_KEY is missing',
      );
    }

    const fullPrompt = negativePrompt
      ? `${prompt}\n\nAvoid: ${negativePrompt}`
      : prompt;

    this.logger.log(
      `Generating image for prompt: "${fullPrompt.slice(0, 80)}..."`,
    );

    const url = `${this.baseUrl}/${this.model}:generateContent`;

    const body = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '2K',
        },
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof DOMException && error.name === 'AbortError') {
        this.logger.error(
          `Gemini image generation timed out after ${this.timeoutMs}ms`,
        );
        throw new Error(
          `Gemini image generation timed out after ${this.timeoutMs}ms`,
        );
      }

      this.logger.error(
        `Gemini image generation network error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Gemini API error ${response.status}: ${errorBody}`,
      );
      throw new Error(
        `Gemini API error ${response.status}: ${errorBody}`,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      this.logger.error(
        `Gemini API returned error: ${data.error.code} ${data.error.message}`,
      );
      throw new Error(
        `Gemini API error ${data.error.code}: ${data.error.message}`,
      );
    }

    const parts = data.candidates?.[0]?.content?.parts;

    if (!parts || parts.length === 0) {
      const finishReason = data.candidates?.[0]?.finishReason;
      this.logger.error(
        `Gemini returned no content parts (finishReason: ${finishReason ?? 'unknown'}). The image may have been blocked by safety filters.`,
      );
      throw new Error(
        `Gemini returned no image. Finish reason: ${finishReason ?? 'unknown'}. The prompt may have been blocked by safety filters.`,
      );
    }

    const imagePart = parts.find(
      (p): p is GeminiImagePart => 'inline_data' in p,
    );

    if (!imagePart) {
      this.logger.error(
        'Gemini response contained text but no image data. Safety filters may have blocked image generation.',
      );
      throw new Error(
        'Gemini response contained no image data. Safety filters may have blocked image generation.',
      );
    }

    const { data: base64, mime_type: mimeType } = imagePart.inline_data;

    if (!base64) {
      throw new Error('Gemini returned an image part with empty data');
    }

    this.logger.log(
      `Image generated successfully (mimeType: ${mimeType}, base64 length: ${base64.length})`,
    );

    return { base64, mimeType };
  }
}
