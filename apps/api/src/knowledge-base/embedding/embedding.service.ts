import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  private readonly available: boolean;

  constructor(config: ConfigService) {
    const openaiKey = config.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.client = new OpenAI({ apiKey: openaiKey });
      this.model = 'text-embedding-3-small';
      this.available = true;
      this.logger.log('Embedding provider: OpenAI (text-embedding-3-small)');
    } else {
      this.logger.warn('OPENAI_API_KEY not set -- KB will use keyword search fallback. Set OPENAI_API_KEY for vector search.');
      this.client = new OpenAI({ apiKey: 'missing' });
      this.model = 'text-embedding-3-small';
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];
    const BATCH_SIZE = this.model.startsWith('voyage') ? 50 : 100;

    try {
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        this.logger.log(
          `Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}: ${batch.length} texts`,
        );

        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        results.push(...response.data.map((d) => d.embedding));
      }
    } catch (err) {
      this.logger.warn(
        `Embedding API call failed (non-fatal, returning partial results): ${err instanceof Error ? err.message : String(err)}`,
      );
      return results; // Return whatever we got before the failure
    }

    return results;
  }
}
