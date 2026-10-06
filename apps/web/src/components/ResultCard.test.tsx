import type { EligibilityCheck, EligibilityResult } from '@eligibility/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultCard } from './ResultCard.js';

function check(result: EligibilityResult, attempts = 1): EligibilityCheck {
  return {
    id: 'chk_test',
    patientId: 'pat_001',
    serviceDate: '2026-10-06',
    result,
    latencyMs: 120,
    attempts,
    createdAt: '2026-10-06T15:00:00.000Z',
  };
}

describe('ResultCard', () => {
  it('renders active coverage with remaining benefit math', () => {
    render(
      <ResultCard
        check={check({
          status: 'active',
          payerId: 'delta-dental',
          memberId: 'DD-1',
          coverage: {
            planName: 'PPO',
            effectiveDate: '2024-01-01',
            terminationDate: null,
            annualMaximumCents: 150_000,
            annualUsedCents: 42_500,
            deductibleCents: 5_000,
            deductibleMetCents: 5_000,
            coinsurance: { preventive: 100, basic: 80, major: 50 },
          },
        })}
      />,
    );
    expect(screen.getByText('Active coverage')).toBeInTheDocument();
    expect(screen.getByText('$1,075.00')).toBeInTheDocument(); // 1500 - 425
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // deductible fully met
  });

  it('renders inactive with the termination date', () => {
    render(
      <ResultCard
        check={check({
          status: 'inactive',
          payerId: 'metlife',
          memberId: 'ML-1',
          terminatedOn: '2026-06-30',
          reason: 'Coverage terminated.',
        })}
      />,
    );
    expect(screen.getByText('Coverage inactive')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
  });

  it('renders not-found guidance', () => {
    render(
      <ResultCard
        check={check({ status: 'not-found', payerId: 'cigna', memberId: 'X', message: 'No subscriber matches.' })}
      />,
    );
    expect(screen.getByText('Member not found')).toBeInTheDocument();
  });

  it('distinguishes retryable from non-retryable payer errors and shows attempts', () => {
    render(
      <ResultCard
        check={check(
          { status: 'payer-error', payerId: 'cigna', memberId: 'X', retryable: true, message: 'Timeout.' },
          3,
        )}
      />,
    );
    expect(screen.getByText(/usually transient/)).toBeInTheDocument();
    expect(screen.getByText(/3 attempts/)).toBeInTheDocument();
  });
});
