export interface RetryPolicy {
  /** Total attempts including the first. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Decides whether a thrown error is worth retrying. */
  isRetryable: (err: unknown) => boolean;
  /** Injectable for tests so retries don't actually sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable jitter source; defaults to Math.random. */
  random?: () => number;
}

export interface RetryOutcome<T> {
  value: T;
  attempts: number;
}

/**
 * Exponential backoff with full jitter (AWS Architecture Blog recommendation):
 * delay = random(0, min(maxDelay, base * 2^attempt)). Jitter prevents a fleet
 * of clients from retrying in lock-step against a payer that is already struggling.
 */
export async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<RetryOutcome<T>> {
  const sleep = policy.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = policy.random ?? Math.random;

  for (let attempt = 1; ; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt };
    } catch (err) {
      const canRetry = attempt < policy.maxAttempts && policy.isRetryable(err);
      if (!canRetry) throw err;
      const cap = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
      await sleep(Math.floor(random() * cap));
    }
  }
}
