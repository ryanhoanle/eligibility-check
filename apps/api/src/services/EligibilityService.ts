import type { EligibilityCheck, EligibilityResult, Patient } from '@eligibility/shared';
import { randomUUID } from 'node:crypto';
import { PayerTransportError } from '../payers/PayerAdapter.js';
import type { PayerRegistry } from '../payers/registry.js';
import { withRetry, type RetryPolicy } from '../payers/retry.js';
import type { CheckRepository, PatientRepository } from './CheckRepository.js';

export class PatientNotFoundError extends Error {
  override readonly name = 'PatientNotFoundError';
  constructor(readonly patientId: string) {
    super(`Patient "${patientId}" not found`);
  }
}

export interface EligibilityServiceDeps {
  patients: PatientRepository;
  checks: CheckRepository;
  payers: PayerRegistry;
  retry?: Partial<Omit<RetryPolicy, 'isRetryable'>>;
  now?: () => Date;
  newId?: () => string;
}

/**
 * Orchestrates one eligibility check:
 *   load patient → pick payer adapter → call with retry → persist → return.
 *
 * Transport failures are converted into a typed `payer-error` result, so the
 * HTTP layer never has to special-case exceptions and every outcome — including
 * failures — is recorded for auditing and latency reporting.
 */
export class EligibilityService {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly deps: EligibilityServiceDeps) {
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? (() => `chk_${randomUUID()}`);
    this.retryPolicy = {
      maxAttempts: 3,
      baseDelayMs: 200,
      maxDelayMs: 2_000,
      ...deps.retry,
      isRetryable: (err) => err instanceof PayerTransportError && err.retryable,
    };
  }

  async check(patientId: string, serviceDate?: string): Promise<EligibilityCheck> {
    const patient = await this.deps.patients.findById(patientId);
    if (!patient) throw new PatientNotFoundError(patientId);

    const dos = serviceDate ?? toIsoDate(this.now());
    const started = performance.now();
    const { result, attempts } = await this.callPayer(patient, dos);

    const record: EligibilityCheck = {
      id: this.newId(),
      patientId: patient.id,
      serviceDate: dos,
      result,
      latencyMs: Math.round(performance.now() - started),
      attempts,
      createdAt: this.now().toISOString(),
    };
    await this.deps.checks.save(record);
    return record;
  }

  private async callPayer(
    patient: Patient,
    serviceDate: string,
  ): Promise<{ result: EligibilityResult; attempts: number }> {
    const adapter = this.deps.payers.get(patient.payerId);
    const query = { payerId: patient.payerId, memberId: patient.memberId, dob: patient.dob, serviceDate };

    try {
      const { value, attempts } = await withRetry(() => adapter.checkEligibility(query), this.retryPolicy);
      return { result: value, attempts };
    } catch (err) {
      if (err instanceof PayerTransportError) {
        return {
          result: {
            status: 'payer-error',
            payerId: patient.payerId,
            memberId: patient.memberId,
            retryable: err.retryable,
            message: err.message,
          },
          // A retryable error only reaches here after exhausting attempts.
          attempts: err.retryable ? this.retryPolicy.maxAttempts : 1,
        };
      }
      throw err; // programming error — let it surface as a 500
    }
  }
}

function toIsoDate(d: Date): string {
  // `d.toISOString().slice(0, 10)` would be UTC; a clinic's date of service is local.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
