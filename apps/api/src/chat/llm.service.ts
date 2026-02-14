import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

export interface LlmStreamChunk {
  content: string;
  done: boolean;
}

/** Optional schema validator function. Returns null if valid, error message if invalid. */
export type JsonValidator<T> = (data: unknown) => data is T;

/** Default timeout for LLM calls (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;
  private readonly defaultModel: string;

  constructor(configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
      timeout: DEFAULT_TIMEOUT_MS,
    });
    this.defaultModel = configService.get<string>(
      'OPENAI_CHAT_MODEL',
      'gpt-4o',
    );
  }

  async *streamChat(
    messages: ChatCompletionMessageParam[],
    model?: string,
  ): AsyncGenerator<LlmStreamChunk> {
    const stream = await this.openai.chat.completions.create({
      model: model ?? this.defaultModel,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { content: delta, done: false };
      }
    }
    yield { content: '', done: true };
  }

  async complete(
    messages: ChatCompletionMessageParam[],
    model?: string,
  ): Promise<string> {
    const result = await this.openai.chat.completions.create({
      model: model ?? this.defaultModel,
      messages,
    });
    return result.choices[0]?.message?.content ?? '';
  }

  /**
   * Complete with JSON mode + parse + validate + retry on failure.
   *
   * @param messages - Chat messages
   * @param model - Optional model override
   * @param validator - Optional type guard to validate the parsed structure
   * @param maxRetries - Number of retries on parse/validation failure (default: 1)
   */
  async completeJson<T>(
    messages: ChatCompletionMessageParam[],
    model?: string,
    validator?: JsonValidator<T>,
    maxRetries = 1,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.openai.chat.completions.create({
          model: model ?? this.defaultModel,
          messages,
          response_format: { type: 'json_object' },
        });

        const content = result.choices[0]?.message?.content ?? '{}';

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : 'JSON parse failed';
          this.logger.warn(
            `JSON parse failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`,
          );
          lastError = new Error(`LLM returned invalid JSON: ${msg}`);

          if (attempt < maxRetries) {
            // Retry with a nudge to fix the JSON
            messages = [
              ...messages,
              { role: 'assistant', content },
              {
                role: 'user',
                content: 'Your previous response was not valid JSON. Please respond with valid JSON only.',
              },
            ];
            continue;
          }
          throw lastError;
        }

        // Structural validation
        if (validator) {
          if (!validator(parsed)) {
            this.logger.warn(
              `JSON structure validation failed (attempt ${attempt + 1}/${maxRetries + 1})`,
            );
            lastError = new Error('LLM response failed structural validation');

            if (attempt < maxRetries) {
              messages = [
                ...messages,
                { role: 'assistant', content },
                {
                  role: 'user',
                  content: 'Your previous JSON response had missing or incorrect fields. Please ensure all required fields are present with correct types.',
                },
              ];
              continue;
            }
            throw lastError;
          }
        }

        return parsed as T;
      } catch (err) {
        // If it's our own validation error being re-thrown, handle above
        if (err === lastError) throw err;

        // OpenAI API error (timeout, rate limit, etc.)
        const msg = err instanceof Error ? err.message : 'Unknown LLM error';
        this.logger.error(
          `LLM API call failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`,
        );
        lastError = err instanceof Error ? err : new Error(msg);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff: 1s, 2s)
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error('completeJson failed');
  }
}
