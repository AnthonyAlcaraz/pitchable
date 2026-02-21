import { createHash } from 'node:crypto';

/**
 * Compute a SHA-256 hex digest of text content after whitespace normalization.
 * Two chunks with identical semantic content but different whitespace will hash the same.
 */
export function contentHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
