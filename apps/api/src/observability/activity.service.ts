import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TrackEventOptions {
  userId?: string;
  eventType: string;
  category: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  duration?: number;
}

@Injectable()
export class ActivityService implements OnModuleDestroy {
  private readonly logger = new Logger(ActivityService.name);
  private buffer: TrackEventOptions[] = [];
  private flushTimer: ReturnType<typeof setInterval>;
  private static readonly FLUSH_INTERVAL_MS = 5000;
  private static readonly MAX_BUFFER_SIZE = 100;

  constructor(private readonly prisma: PrismaService) {
    this.flushTimer = setInterval(() => this.flush(), ActivityService.FLUSH_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.flushTimer);
    this.flush();
  }

  /** Fire-and-forget event tracking. Never throws. */
  track(options: TrackEventOptions): void {
    this.buffer.push(options);
    if (this.buffer.length >= ActivityService.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0);
    const data = events.map((e) => ({
      userId: e.userId ?? null,
      eventType: e.eventType,
      category: e.category,
      metadata: (e.metadata ?? {}) as InputJsonValue,
      ipHash: e.ip ? createHash('sha256').update(e.ip).digest('hex').slice(0, 16) : null,
      duration: e.duration ?? null,
    }));

    this.prisma.activityEvent
      .createMany({ data })
      .catch((err: unknown) => {
        this.logger.warn(`Failed to flush ${data.length} activity events: ${err}`);
      });
  }
}
