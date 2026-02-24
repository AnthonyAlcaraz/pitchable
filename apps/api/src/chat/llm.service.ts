import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/** Shared message type for all LLM interactions. */
export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmStreamChunk {
  content: string;
  done: boolean;
}

/** Content block with optional cache control for Anthropic prompt caching. */
export interface SystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/** Optional schema validator function. Returns null if valid, error message if invalid. */
export type JsonValidator<T> = (data: unknown) => data is T;

/** Default timeout for LLM calls (120 seconds — Opus needs more time for rich content). */
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Model routing for cost optimization.
 *
 * OPUS   — Quality-critical: slide content generation ($5/$25 per MTok)
 * SONNET — Mid-tier: outline gen, chat, slide modification, renderer chooser ($3/$15 per MTok)
 * HAIKU  — Fast/cheap: intent classification, content review ($0.80/$4 per MTok)
 */
export const LlmModel = {
  OPUS: 'claude-opus-4-6',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

export type LlmModelId = (typeof LlmModel)[keyof typeof LlmModel];

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly anthropic: Anthropic;
  private readonly defaultModel: string;

  constructor(configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: configService.get<string>('ANTHROPIC_API_KEY'),
      timeout: DEFAULT_TIMEOUT_MS,
    });
    this.defaultModel = configService.get<string>(
      'ANTHROPIC_MODEL',
      LlmModel.OPUS,
    );
  }

  /**
   * Extract system message(s) and non-system messages from the input array.
   * Anthropic takes `system` as a top-level parameter, not as a message role.
   */
  private separateSystemMessages(
    messages: LlmMessage[],
  ): { system: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
    const systemParts: string[] = [];
    const nonSystem: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else {
        nonSystem.push({ role: msg.role, content: msg.content });
      }
    }

    return {
      system: systemParts.join('\n\n'),
      messages: nonSystem,
    };
  }

  async *streamChat(
    messages: LlmMessage[],
    model?: string,
  ): AsyncGenerator<LlmStreamChunk> {
    const { system, messages: nonSystem } = this.separateSystemMessages(messages);

    const stream = this.anthropic.messages.stream({
      model: model ?? this.defaultModel,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: nonSystem,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  }

  async complete(
    messages: LlmMessage[],
    model?: string,
  ): Promise<string> {
    const { system, messages: nonSystem } = this.separateSystemMessages(messages);

    const result = await this.anthropic.messages.create({
      model: model ?? this.defaultModel,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: nonSystem,
    });

    const textBlock = result.content.find((block) => block.type === 'text');
    return textBlock?.text ?? '';
  }

  /**
   * Complete with JSON instruction + parse + validate + retry on failure.
   *
   * Claude Opus 4.6 does not support assistant message prefill.
   * Instead we rely on strong system prompt instruction for JSON output.
   *
   * @param messages - Chat messages
   * @param model - Model to use (use LlmModel.OPUS/SONNET/HAIKU for cost routing)
   * @param validator - Optional type guard to validate the parsed structure
   * @param maxRetries - Number of retries on parse/validation failure (default: 1)
   */
  async completeJson<T>(
    messages: LlmMessage[],
    model?: string,
    validator?: JsonValidator<T>,
    maxRetries = 1,
    options?: { cacheSystemPrompt?: boolean },
  ): Promise<T> {
    let lastError: Error | null = null;
    // Build a mutable copy of non-system messages for retry nudges
    let { system, messages: nonSystem } = this.separateSystemMessages(messages);

    // Append JSON instruction to system prompt
    const jsonInstruction = '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown fences, no explanation, no text before or after the JSON. Output ONLY a single JSON object.';
    const jsonSystemString = system
      ? system + jsonInstruction
      : 'You MUST respond with valid JSON only. No markdown fences, no explanation, no text before or after the JSON. Output ONLY a single JSON object.';

    // Build system param: use content blocks with cache_control when caching is enabled
    const systemParam: string | SystemBlock[] = options?.cacheSystemPrompt && system
      ? [
          { type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } },
          { type: 'text' as const, text: jsonInstruction },
        ]
      : jsonSystemString;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.anthropic.messages.create({
          model: model ?? this.defaultModel,
          max_tokens: 4096,
          system: systemParam,
          messages: nonSystem,
        });

        const textBlock = result.content.find((block) => block.type === 'text');
        const rawContent = (textBlock?.text ?? '').trim();

        // Strip markdown fences if present (```json ... ```)
        const content = rawContent
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/, '')
          .trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : 'JSON parse failed';
          this.logger.warn(
            `JSON parse failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}\nRaw: ${content.substring(0, 200)}`,
          );
          lastError = new Error(`LLM returned invalid JSON: ${msg}`);

          if (attempt < maxRetries) {
            // Retry with a nudge to fix the JSON
            nonSystem = [
              ...nonSystem,
              { role: 'assistant' as const, content: rawContent },
              {
                role: 'user' as const,
                content: 'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object. No markdown fences, no explanation.',
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
              nonSystem = [
                ...nonSystem,
                { role: 'assistant' as const, content: rawContent },
                {
                  role: 'user' as const,
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

        // Anthropic API error (timeout, rate limit, etc.)
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

  /**
   * Complete with vision (image+text) content blocks + JSON parse + validate + retry.
   *
   * Similar to completeJson<T>() but accepts Anthropic ContentBlockParam[] for
   * multimodal inputs (e.g. image thumbnails + text instructions).
   *
   * @param systemPrompt - System prompt text
   * @param contentBlocks - Array of Anthropic content blocks (text + image)
   * @param model - Model to use (defaults to SONNET for vision tasks)
   * @param validator - Optional type guard to validate the parsed structure
   * @param maxRetries - Number of retries on parse/validation failure (default: 1)
   */
  async completeJsonVision<T>(
    systemPrompt: string,
    contentBlocks: Array<Anthropic.ContentBlockParam>,
    model?: string,
    validator?: JsonValidator<T>,
    maxRetries = 1,
  ): Promise<T> {
    let lastError: Error | null = null;

    const jsonInstruction = '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown fences, no explanation, no text before or after the JSON. Output ONLY a single JSON object.';
    const fullSystem = systemPrompt + jsonInstruction;

    // Start with the user content blocks as-is
    let messages: Array<{ role: 'user' | 'assistant'; content: string | Array<Anthropic.ContentBlockParam> }> = [
      { role: 'user' as const, content: contentBlocks },
    ];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.anthropic.messages.create({
          model: model ?? LlmModel.OPUS,
          max_tokens: 4096,
          system: fullSystem,
          messages,
        });

        const textBlock = result.content.find((block) => block.type === 'text');
        const rawContent = (textBlock?.text ?? '').trim();

        // Strip markdown fences if present
        const content = rawContent
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/, '')
          .trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : 'JSON parse failed';
          this.logger.warn(
            `JSON parse failed in vision call (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}\nRaw: ${content.substring(0, 200)}`,
          );
          lastError = new Error(`LLM vision returned invalid JSON: ${msg}`);

          if (attempt < maxRetries) {
            messages = [
              ...messages,
              { role: 'assistant' as const, content: rawContent },
              {
                role: 'user' as const,
                content: 'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object. No markdown fences, no explanation.',
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
              `JSON structure validation failed in vision call (attempt ${attempt + 1}/${maxRetries + 1})`,
            );
            lastError = new Error('LLM vision response failed structural validation');

            if (attempt < maxRetries) {
              messages = [
                ...messages,
                { role: 'assistant' as const, content: rawContent },
                {
                  role: 'user' as const,
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
        if (err === lastError) throw err;

        const msg = err instanceof Error ? err.message : 'Unknown LLM error';
        this.logger.error(
          `LLM vision API call failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`,
        );
        lastError = err instanceof Error ? err : new Error(msg);

        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new Error('completeJsonVision failed');
  }
}
