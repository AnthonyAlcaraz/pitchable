/**
 * Base interface for all BullMQ job data envelopes.
 * Every processor's job data should extend this.
 */
export interface BaseJobData {
  userId: string;
  correlationId: string;
  timestamp: number;
}
