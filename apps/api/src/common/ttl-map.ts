/**
 * A Map wrapper with automatic TTL-based expiry and max-size eviction.
 * Prevents memory leaks from abandoned entries.
 */
export class TtlMap<K, V> {
  private readonly store = new Map<K, { value: V; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly ttlMs: number,
    private readonly maxSize: number = 10_000,
    cleanupIntervalMs: number = 60_000,
  ) {
    this.cleanupTimer = setInterval(() => this.evictExpired(), cleanupIntervalMs);
    // Allow Node to exit even if the timer is still running
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    // Evict oldest entries if at max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  /** Delete all entries whose keys match a prefix (for string keys). */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Find the first entry whose key matches a prefix. */
  findByPrefix(prefix: string): { key: K; value: V } | undefined {
    for (const [key, entry] of this.store.entries()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        if (Date.now() > entry.expiresAt) {
          this.store.delete(key);
          continue;
        }
        return { key, value: entry.value };
      }
    }
    return undefined;
  }

  /** Check if any key matches a prefix. */
  hasByPrefix(prefix: string): boolean {
    return this.findByPrefix(prefix) !== undefined;
  }

  get size(): number {
    return this.store.size;
  }

  /** Remove all expired entries. */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Cleanup on module destroy. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}
