import { Injectable, Logger } from '@nestjs/common';

interface PendingInteraction<T = unknown> {
  resolve: (value: T) => void;
  timer: ReturnType<typeof setTimeout>;
  defaultValue: T;
}

@Injectable()
export class InteractionGateService {
  private readonly logger = new Logger(InteractionGateService.name);

  /** Pending interactions keyed by `${presentationId}:${interactionType}:${contextId}` */
  private readonly pending = new Map<string, PendingInteraction>();

  /**
   * Block the pipeline until the user responds or timeout expires.
   * Returns the user's selection or defaultValue on timeout.
   */
  waitForResponse<T>(
    presentationId: string,
    interactionType: string,
    contextId: string,
    defaultValue: T,
    timeoutMs: number,
  ): Promise<T> {
    const key = `${presentationId}:${interactionType}:${contextId}`;

    // Clean up any existing pending interaction for this key
    this.cleanup(key);

    return new Promise<T>((resolve) => {
      const timer = setTimeout(() => {
        this.logger.debug(`Interaction timeout [${key}], using default`);
        this.pending.delete(key);
        resolve(defaultValue);
      }, timeoutMs);

      // Allow Node to exit even if timer is running
      if (timer.unref) {
        timer.unref();
      }

      this.pending.set(key, {
        resolve: resolve as (value: unknown) => void,
        timer,
        defaultValue,
      });
    });
  }

  /**
   * Resolve a pending interaction with the user's selection.
   * Returns true if a pending interaction was found and resolved.
   */
  respond(
    presentationId: string,
    interactionType: string,
    contextId: string,
    value: unknown,
  ): boolean {
    const key = `${presentationId}:${interactionType}:${contextId}`;
    const entry = this.pending.get(key);

    if (!entry) {
      this.logger.debug(`No pending interaction for [${key}]`);
      return false;
    }

    clearTimeout(entry.timer);
    this.pending.delete(key);
    entry.resolve(value);
    this.logger.debug(`Interaction resolved [${key}]`);
    return true;
  }

  /**
   * Check if there's a pending interaction.
   */
  hasPending(presentationId: string, interactionType: string, contextId: string): boolean {
    return this.pending.has(`${presentationId}:${interactionType}:${contextId}`);
  }

  private cleanup(key: string): void {
    const entry = this.pending.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      entry.resolve(entry.defaultValue);
      this.pending.delete(key);
    }
  }
}
