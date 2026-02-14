import { TtlMap } from './ttl-map';

describe('TtlMap', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve values', () => {
    const map = new TtlMap<string, number>(10_000);
    map.set('a', 1);
    map.set('b', 2);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    map.destroy();
  });

  it('should return undefined for missing keys', () => {
    const map = new TtlMap<string, number>(10_000);
    expect(map.get('missing')).toBeUndefined();
    map.destroy();
  });

  it('should expire entries after TTL', () => {
    jest.useFakeTimers();
    const map = new TtlMap<string, number>(1000, 100, 60_000);
    map.set('key', 42);

    expect(map.get('key')).toBe(42);

    jest.advanceTimersByTime(1001);

    expect(map.get('key')).toBeUndefined();
    map.destroy();
  });

  it('should evict oldest entry when max size exceeded', () => {
    const map = new TtlMap<string, number>(60_000, 3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    // Should be at capacity
    expect(map.size).toBe(3);

    // Adding a 4th should evict 'a' (oldest)
    map.set('d', 4);
    expect(map.size).toBe(3);
    expect(map.get('a')).toBeUndefined();
    expect(map.get('d')).toBe(4);
    map.destroy();
  });

  it('should not evict when updating existing key', () => {
    const map = new TtlMap<string, number>(60_000, 3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    // Update existing key — should not evict
    map.set('a', 10);
    expect(map.size).toBe(3);
    expect(map.get('a')).toBe(10);
    expect(map.get('b')).toBe(2);
    map.destroy();
  });

  it('should support has()', () => {
    jest.useFakeTimers();
    const map = new TtlMap<string, number>(500, 100, 60_000);
    map.set('key', 1);

    expect(map.has('key')).toBe(true);
    expect(map.has('other')).toBe(false);

    jest.advanceTimersByTime(501);
    expect(map.has('key')).toBe(false);
    map.destroy();
  });

  it('should support delete()', () => {
    const map = new TtlMap<string, number>(60_000);
    map.set('key', 1);
    expect(map.delete('key')).toBe(true);
    expect(map.get('key')).toBeUndefined();
    expect(map.delete('missing')).toBe(false);
    map.destroy();
  });

  it('should deleteByPrefix()', () => {
    const map = new TtlMap<string, number>(60_000);
    map.set('pres:1:slide:a', 1);
    map.set('pres:1:slide:b', 2);
    map.set('pres:2:slide:c', 3);

    map.deleteByPrefix('pres:1:');
    expect(map.size).toBe(1);
    expect(map.get('pres:2:slide:c')).toBe(3);
    map.destroy();
  });

  it('should findByPrefix()', () => {
    const map = new TtlMap<string, string>(60_000);
    map.set('user:1:name', 'Alice');
    map.set('user:2:name', 'Bob');

    const found = map.findByPrefix('user:1:');
    expect(found).toBeDefined();
    expect(found!.value).toBe('Alice');

    expect(map.findByPrefix('user:3:')).toBeUndefined();
    map.destroy();
  });

  it('should skip expired entries in findByPrefix()', () => {
    jest.useFakeTimers();
    const map = new TtlMap<string, string>(500, 100, 60_000);
    map.set('p:1:a', 'first');

    jest.advanceTimersByTime(501);

    map.set('p:1:b', 'second');

    const found = map.findByPrefix('p:1:');
    expect(found).toBeDefined();
    expect(found!.value).toBe('second');
    map.destroy();
  });

  it('should hasByPrefix()', () => {
    const map = new TtlMap<string, number>(60_000);
    map.set('x:1', 1);

    expect(map.hasByPrefix('x:')).toBe(true);
    expect(map.hasByPrefix('y:')).toBe(false);
    map.destroy();
  });

  it('should evict expired entries on cleanup interval', () => {
    jest.useFakeTimers();
    const map = new TtlMap<string, number>(500, 100, 1000);
    map.set('a', 1);
    map.set('b', 2);

    jest.advanceTimersByTime(501);
    // Entries expired but not yet cleaned
    expect(map.size).toBe(2);

    // Trigger cleanup
    jest.advanceTimersByTime(1000);
    expect(map.size).toBe(0);
    map.destroy();
  });

  it('should clear everything on destroy()', () => {
    const map = new TtlMap<string, number>(60_000);
    map.set('a', 1);
    map.set('b', 2);
    map.destroy();
    expect(map.size).toBe(0);
  });
});
