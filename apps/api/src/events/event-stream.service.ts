import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface PresentationEvent {
  type: string;
  presentationId: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

@Injectable()
export class EventStreamService {
  private readonly logger = new Logger(EventStreamService.name);
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        this.redis.connect().catch((err) => {
          this.logger.warn(`Redis streams unavailable: ${err.message}`);
          this.redis = null;
        });
      } catch {
        this.logger.warn('Redis streams: failed to create client');
      }
    }
  }

  /**
   * Append an event to the presentation's stream.
   * Fire-and-forget -- never blocks the caller.
   */
  appendEvent(event: PresentationEvent): void {
    if (!this.redis) return;

    const streamKey = `events:presentation:${event.presentationId}`;
    const fields: string[] = [
      'type',
      event.type,
      'presentationId',
      event.presentationId,
      'data',
      JSON.stringify(event.data),
      'timestamp',
      String(event.timestamp ?? Date.now()),
    ];
    if (event.userId) {
      fields.push('userId', event.userId);
    }

    this.redis
      .xadd(streamKey, 'MAXLEN', '~', '1000', '*', ...fields)
      .catch((err) => {
        this.logger.debug(`Event stream append failed: ${err.message}`);
      });
  }

  /**
   * Retrieve recent events for a presentation.
   */
  async getHistory(
    presentationId: string,
    count = 50,
  ): Promise<PresentationEvent[]> {
    if (!this.redis) return [];

    const streamKey = `events:presentation:${presentationId}`;
    try {
      const entries = await this.redis.xrevrange(
        streamKey,
        '+',
        '-',
        'COUNT',
        count,
      );
      return entries.map(([_id, fields]) => {
        const fieldMap: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          fieldMap[fields[i]] = fields[i + 1];
        }
        return {
          type: fieldMap['type'] ?? 'unknown',
          presentationId: fieldMap['presentationId'] ?? presentationId,
          userId: fieldMap['userId'],
          data: JSON.parse(fieldMap['data'] ?? '{}'),
          timestamp: Number(fieldMap['timestamp'] ?? 0),
        };
      });
    } catch (err) {
      this.logger.debug(
        `Event stream read failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return [];
    }
  }
}
