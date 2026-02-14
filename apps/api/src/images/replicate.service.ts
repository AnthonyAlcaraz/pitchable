import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ──────────────────────────────────────────────

interface CreatePredictionResponse {
  id: string;
  status: string;
}

interface PredictionResponse {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly apiToken: string;
  private readonly modelId = 'google/imagegeneration@002';
  private readonly baseUrl = 'https://api.replicate.com/v1';

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.getOrThrow<string>('REPLICATE_API_TOKEN');
  }

  async createPrediction(
    prompt: string,
    negativePrompt: string,
  ): Promise<CreatePredictionResponse> {
    const url = `${this.baseUrl}/predictions`;

    this.logger.log(`Creating prediction for prompt: "${prompt.slice(0, 80)}..."`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: this.modelId,
        input: {
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: '16:9',
          output_format: 'png',
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Replicate createPrediction failed: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Replicate API error ${response.status}: ${errorBody}`,
      );
    }

    const data = (await response.json()) as CreatePredictionResponse;
    this.logger.log(`Prediction created: ${data.id} (status: ${data.status})`);

    return { id: data.id, status: data.status };
  }

  async getPrediction(predictionId: string): Promise<PredictionResponse> {
    const url = `${this.baseUrl}/predictions/${predictionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Replicate getPrediction failed: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Replicate API error ${response.status}: ${errorBody}`,
      );
    }

    const data = (await response.json()) as PredictionResponse;
    return {
      id: data.id,
      status: data.status,
      output: data.output,
      error: data.error,
    };
  }

  async waitForPrediction(
    predictionId: string,
    maxWaitMs = 120_000,
  ): Promise<string> {
    const pollIntervalMs = 2_000;
    const startTime = Date.now();

    this.logger.log(
      `Polling prediction ${predictionId} (max wait: ${maxWaitMs}ms)`,
    );

    while (Date.now() - startTime < maxWaitMs) {
      const prediction = await this.getPrediction(predictionId);

      if (prediction.status === 'succeeded') {
        if (!prediction.output || prediction.output.length === 0) {
          throw new Error(
            `Prediction ${predictionId} succeeded but returned no output`,
          );
        }

        this.logger.log(`Prediction ${predictionId} succeeded`);
        return prediction.output[0];
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const errorMsg =
          prediction.error ?? `Prediction ${prediction.status}`;
        this.logger.error(
          `Prediction ${predictionId} ${prediction.status}: ${errorMsg}`,
        );
        throw new Error(errorMsg);
      }

      // Still processing - wait and poll again
      await this.sleep(pollIntervalMs);
    }

    throw new Error(
      `Prediction ${predictionId} timed out after ${maxWaitMs}ms`,
    );
  }

  async generateImage(
    prompt: string,
    negativePrompt: string,
  ): Promise<string> {
    const prediction = await this.createPrediction(prompt, negativePrompt);
    return this.waitForPrediction(prediction.id);
  }

  // ── Private Helpers ─────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
