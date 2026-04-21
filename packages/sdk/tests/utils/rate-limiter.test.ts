import { describe, it, expect, vi, afterEach } from 'vitest';
import { RateLimiter } from '../../src/utils/rate-limiter';

afterEach(() => vi.useRealTimers());

describe('RateLimiter', () => {
  it('resolves immediately when under the limit', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 10 });
    // Both should complete without any timer advancing
    await limiter.acquire();
    await limiter.acquire();
  });

  it('queues the third request when limit is 2', async () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({ requestsPerSecond: 2 });
    const order: number[] = [];

    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));
    const p3 = limiter.acquire().then(() => order.push(3));

    // Flush microtasks — p1 and p2 should resolve, p3 still pending
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toContain(1);
    expect(order).toContain(2);
    expect(order).not.toContain(3);

    // Advance past the 1-second window — p3 should now resolve
    await vi.advanceTimersByTimeAsync(1000);
    await p3;
    expect(order).toContain(3);
  });

  it('rate of 1 req/sec delays second call by ~1s', async () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({ requestsPerSecond: 1 });
    const order: number[] = [];

    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));

    await vi.advanceTimersByTimeAsync(0);
    expect(order).toContain(1);
    expect(order).not.toContain(2);

    await vi.advanceTimersByTimeAsync(1000);
    await p2;
    expect(order).toContain(2);
  });

  it('resets window count after 1 second', async () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({ requestsPerSecond: 1 });

    // First request consumes the window
    await limiter.acquire();

    // Advance past window — window should reset
    await vi.advanceTimersByTimeAsync(1100);

    // Second request after window reset should resolve immediately
    const resolved = await Promise.race([
      limiter.acquire().then(() => true),
      new Promise<boolean>((r) => setTimeout(() => r(false), 0)),
    ]);
    expect(resolved).toBe(true);
  });
});
