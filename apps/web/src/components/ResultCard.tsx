import {
  formatCents,
  PAYERS,
  remainingCents,
  type EligibilityCheck,
  type EligibilityResult,
} from '@eligibility/shared';

interface Props {
  check: EligibilityCheck;
}

const STATUS_LABEL: Record<EligibilityResult['status'], string> = {
  active: 'Active coverage',
  inactive: 'Coverage inactive',
  'not-found': 'Member not found',
  'payer-error': 'Payer unavailable',
};

export function ResultCard({ check }: Props) {
  const { result } = check;
  return (
    <article className={`result result--${result.status}`} data-testid="result-card">
      <header className="result__header">
        <span className="result__badge">{STATUS_LABEL[result.status]}</span>
        <span className="muted">
          {PAYERS[result.payerId]} · {check.serviceDate}
        </span>
      </header>

      <ResultBody result={result} />

      <footer className="result__meta muted">
        {check.latencyMs} ms · {check.attempts} attempt{check.attempts === 1 ? '' : 's'} · {check.id}
      </footer>
    </article>
  );
}

/**
 * Exhaustive over the discriminated union: adding a fifth status to the shared
 * schema makes this a compile error until the UI handles it.
 */
function ResultBody({ result }: { result: EligibilityResult }) {
  switch (result.status) {
    case 'active': {
      const c = result.coverage;
      return (
        <dl className="kv">
          <div>
            <dt>Plan</dt>
            <dd>{c.planName}</dd>
          </div>
          <div>
            <dt>Effective</dt>
            <dd>
              {c.effectiveDate}
              {c.terminationDate ? ` → ${c.terminationDate}` : ''}
            </dd>
          </div>
          <div>
            <dt>Annual max remaining</dt>
            <dd>
              {formatCents(remainingCents(c.annualMaximumCents, c.annualUsedCents))}{' '}
              <span className="muted">of {formatCents(c.annualMaximumCents)}</span>
            </dd>
          </div>
          <div>
            <dt>Deductible remaining</dt>
            <dd>
              {formatCents(remainingCents(c.deductibleCents, c.deductibleMetCents))}{' '}
              <span className="muted">of {formatCents(c.deductibleCents)}</span>
            </dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>
              Preventive {c.coinsurance.preventive}% · Basic {c.coinsurance.basic}% · Major {c.coinsurance.major}%
            </dd>
          </div>
        </dl>
      );
    }
    case 'inactive':
      return (
        <p>
          Terminated on <strong>{result.terminatedOn}</strong>. {result.reason}
        </p>
      );
    case 'not-found':
      return <p>{result.message} Verify the member ID and date of birth with the patient.</p>;
    case 'payer-error':
      return (
        <p>
          {result.message.endsWith('.') ? result.message : `${result.message}.`}{' '}
          {result.retryable ? 'This is usually transient — try again in a minute.' : 'Contact support; retrying will not help.'}
        </p>
      );
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
