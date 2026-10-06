import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry.js';

const noSleep = async () => {};

describe('withRetry', () => {
  it('returns on first success with attempts=1', async () => {
    const r = await withRetry(async () => 42, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => true,
      sleep: noSleep,
    });
    expect(r).toEqual({ value: 42, attempts: 1 });
  });

  it('retries retryable errors up to maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockRejectedValueOnce(new Error('b')).mockResolvedValue('ok');
    const r = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => true,
      sleep: noSleep,
    });
    expect(r).toEqual({ value: 'ok', attempts: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on a non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 100, isRetryable: () => false, sleep: noSleep }),
    ).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caps the backoff delay and applies jitter', async () => {
    const sleeps: number[] = [];
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    await expect(
      withRetry(fn, {
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 250,
        isRetryable: () => true,
        sleep: async (ms) => void sleeps.push(ms),
        random: () => 1, // upper bound of the jitter window
      }),
    ).rejects.toThrow('x');
    // attempt 1 → cap(100), attempt 2 → cap(200), attempt 3 → min(250, 400)=250
    expect(sleeps).toEqual([100, 200, 250]);
  });
});
