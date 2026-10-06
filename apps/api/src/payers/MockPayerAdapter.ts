import type { Coverage, EligibilityResult, PayerId } from '@eligibility/shared';
import { PayerTransportError, type PayerAdapter, type PayerQuery } from './PayerAdapter.js';

/**
 * A deterministic stand-in for a payer API.
 *
 * Behaviour is driven by the member ID so demos and tests are reproducible:
 *   - known member, no termination  → active
 *   - known member, terminated      → inactive
 *   - unknown member                → not-found
 *   - member ID ends in "-TIMEOUT"  → fails (retryable) N times, then succeeds
 *   - member ID ends in "-AUTH"     → fails (non-retryable) every time
 */

export interface MockMember {
  memberId: string;
  dob: string;
  coverage: Coverage;
}

export interface MockPayerOptions {
  payerId: PayerId;
  members: readonly MockMember[];
  /** Simulated latency, ms. Default 0 (tests). */
  latency?: { minMs: number; maxMs: number };
  /** How many consecutive calls a "-TIMEOUT" member fails before succeeding. */
  timeoutFailures?: number;
  /** Injectable clock so "is the plan terminated as of serviceDate" is testable. */
  now?: () => Date;
}

export class MockPayerAdapter implements PayerAdapter {
  readonly payerId: PayerId;
  private readonly members: Map<string, MockMember>;
  private readonly latency: { minMs: number; maxMs: number };
  private readonly timeoutFailures: number;
  private readonly timeoutCounters = new Map<string, number>();

  constructor(opts: MockPayerOptions) {
    this.payerId = opts.payerId;
    this.members = new Map(opts.members.map((m) => [m.memberId, m]));
    this.latency = opts.latency ?? { minMs: 0, maxMs: 0 };
    this.timeoutFailures = opts.timeoutFailures ?? 2;
  }

  async checkEligibility(query: PayerQuery): Promise<EligibilityResult> {
    await this.simulateLatency();

    if (query.memberId.endsWith('-AUTH')) {
      throw new PayerTransportError(`${this.payerId}: 401 invalid trading-partner credentials`, false);
    }

    if (query.memberId.endsWith('-TIMEOUT')) {
      const failures = this.timeoutCounters.get(query.memberId) ?? 0;
      if (failures < this.timeoutFailures) {
        this.timeoutCounters.set(query.memberId, failures + 1);
        throw new PayerTransportError(`${this.payerId}: gateway timeout after 30s`, true);
      }
      this.timeoutCounters.delete(query.memberId);
    }

    const member = this.members.get(query.memberId);
    if (!member || member.dob !== query.dob) {
      return {
        status: 'not-found',
        payerId: this.payerId,
        memberId: query.memberId,
        message: 'No subscriber matches the member ID and date of birth provided.',
      };
    }

    const { terminationDate } = member.coverage;
    if (terminationDate !== null && terminationDate < query.serviceDate) {
      return {
        status: 'inactive',
        payerId: this.payerId,
        memberId: query.memberId,
        terminatedOn: terminationDate,
        reason: 'Coverage terminated before the date of service.',
      };
    }

    return {
      status: 'active',
      payerId: this.payerId,
      memberId: query.memberId,
      coverage: member.coverage,
    };
  }

  private async simulateLatency(): Promise<void> {
    const { minMs, maxMs } = this.latency;
    if (maxMs <= 0) return;
    const ms = minMs + Math.random() * Math.max(0, maxMs - minMs);
    await new Promise((r) => setTimeout(r, ms));
  }
}
