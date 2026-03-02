import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RecordMetricOptions {
  userId: string;
  presentationId?: string;
  operation: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  durationMs: number;
  slideType?: string;
  slideCount?: number;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class GenerationMetricsService {
  private readonly logger = new Logger(GenerationMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget metric recording. Never throws. */
  record(options: RecordMetricOptions): void {
    this.prisma.generationMetric
      .create({
        data: {
          userId: options.userId,
          presentationId: options.presentationId ?? null,
          operation: options.operation,
          model: options.model,
          inputTokens: options.inputTokens ?? 0,
          outputTokens: options.outputTokens ?? 0,
          cacheReadTokens: options.cacheReadTokens ?? 0,
          cacheWriteTokens: options.cacheWriteTokens ?? 0,
          durationMs: options.durationMs,
          slideType: options.slideType ?? null,
          slideCount: options.slideCount ?? null,
          success: options.success ?? true,
          errorMessage: options.errorMessage ?? null,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Failed to record generation metric: ${err}`);
      });
  }
}
