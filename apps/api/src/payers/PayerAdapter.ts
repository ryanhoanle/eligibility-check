import type { EligibilityResult, PayerId } from '@eligibility/shared';

export interface PayerQuery {
  payerId: PayerId;
  memberId: string;
  dob: string;
  serviceDate: string;
}

/**
 * One adapter per payer. Real adapters wrap a clearinghouse (X12 270/271) or a
 * payer's JSON API; this interface hides which one it is from the rest of the app.
 *
 * Contract:
 *  - Return a result for every *business* outcome (active / inactive / not-found).
 *  - Throw only for *transport* failures (timeouts, 5xx, auth). The service
 *    layer decides whether to retry and converts a final failure into a
 *    `payer-error` result so the caller always gets a typed answer.
 */
export interface PayerAdapter {
  readonly payerId: PayerId;
  checkEligibility(query: PayerQuery): Promise<EligibilityResult>;
}

/** Transport-level failure from a payer. `retryable` drives the retry policy. */
export class PayerTransportError extends Error {
  override readonly name = 'PayerTransportError';
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
