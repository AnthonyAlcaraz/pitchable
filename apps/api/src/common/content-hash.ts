import { createHash } from 'crypto';

/**
 * Compute a deterministic SHA-256 hash (16-char hex prefix) for slide content.
 * Used for incremental export caching -- unchanged slides skip re-rendering.
 */
export function computeSlideHash(
  title: string,
  body: string,
  speakerNotes: string | null,
  slideType: string,
  imageUrl: string | null,
): string {
  const input = [title, body, speakerNotes ?? '', slideType, imageUrl ?? ''].join('|');
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}
