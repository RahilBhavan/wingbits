import { describe, it, expect, vi, afterEach } from 'vitest';
import { withRetry } from '../../src/utils/retry';

afterEach(() => vi.useRealTimers());

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable status codes and eventually succeeds', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all attempts', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue({ statusCode: 500 });
    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 10 }).catch((e) => e);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toMatchObject({ statusCode: 500 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors (e.g. 404)', async () => {
    const fn = vi.fn().mockRejectedValue({ statusCode: 404 });
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-object errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('unexpected'));
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow('unexpected');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
