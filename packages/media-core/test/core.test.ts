import { describe, expect, it, vi } from 'vitest';
import { EventEmitter, TtlCache, InFlight } from '../src/index.js';

describe('EventEmitter', () => {
  it('subscribes, emits and unsubscribes', () => {
    const emitter = new EventEmitter<number>();
    const seen: number[] = [];
    const off = emitter.subscribe((n) => seen.push(n));

    emitter.emit(1);
    emitter.emit(2);
    off();
    emitter.emit(3);

    expect(seen).toEqual([1, 2]);
    expect(emitter.listenerCount()).toBe(0);
  });

  it('notifies every listener even if one throws', () => {
    const emitter = new EventEmitter<number>();
    const seen: number[] = [];
    emitter.subscribe(() => {
      throw new Error('boom');
    });
    emitter.subscribe((n) => seen.push(n));
    expect(() => emitter.emit(1)).not.toThrow();
    expect(seen).toEqual([1]);
  });
});

describe('TtlCache', () => {
  it('stores and reads values', () => {
    const cache = new TtlCache<string>();
    cache.set('a', '1');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts entries after the TTL', async () => {
    const cache = new TtlCache<number>({ ttlMs: 5 });
    cache.set('a', 1);
    await new Promise((r) => setTimeout(r, 15));
    expect(cache.get('a')).toBeUndefined();
  });

  it('caps the number of entries (FIFO eviction)', () => {
    const cache = new TtlCache<number>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });
});

describe('InFlight', () => {
  it('shares a single promise for concurrent calls with the same key', async () => {
    const inflight = new InFlight();
    const factory = vi.fn(async () => 42);

    const results = await Promise.all([
      inflight.run('k', factory),
      inflight.run('k', factory),
      inflight.run('k', factory),
    ]);

    expect(results).toEqual([42, 42, 42]);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('runs the factory again for a new key after completion', async () => {
    const inflight = new InFlight();
    let runs = 0;
    await inflight.run('k', async () => {
      runs += 1;
    });
    await inflight.run('k', async () => {
      runs += 1;
    });
    expect(runs).toBe(2);
  });
});
