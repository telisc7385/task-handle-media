/**
 * In-memory caching primitives:
 *  - `TtlCache`: time-based response cache.
 *  - `InFlight`: request deduplication (shares one promise per key).
 *
 * Both are framework-independent and swap-friendly (any store with the same
 * surface can be injected into the client).
 */

export interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
}

export interface TtlCacheOptions {
  /** Time-to-live in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number;
  /** Soft cap on entries; oldest entries are evicted first. */
  maxEntries?: number;
}

export class TtlCache<T = unknown> implements CacheStore<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: TtlCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 100;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.evictExpired();
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }
}

/**
 * Shares a single in-flight promise for a given key so concurrent callers
 * for the same resource perform only one network request.
 */
export class InFlight {
  private readonly pending = new Map<string, Promise<unknown>>();

  run<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = factory().finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}
