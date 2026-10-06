import { describe, expect, it } from 'vitest';
import { eligibilityRequestSchema, eligibilityResultSchema } from './schemas.js';
import { formatCents, remainingCents } from './money.js';

describe('eligibilityRequestSchema', () => {
  it('accepts a valid request', () => {
    const r = eligibilityRequestSchema.safeParse({ patientId: 'p1', serviceDate: '2026-10-06' });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed service date', () => {
    const r = eligibilityRequestSchema.safeParse({ patientId: 'p1', serviceDate: '10/06/2026' });
    expect(r.success).toBe(false);
  });
});

describe('eligibilityResultSchema', () => {
  it('rejects an active result that is missing coverage', () => {
    const r = eligibilityResultSchema.safeParse({
      status: 'active',
      payerId: 'metlife',
      memberId: 'X',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown status', () => {
    const r = eligibilityResultSchema.safeParse({ status: 'pending', payerId: 'metlife', memberId: 'X' });
    expect(r.success).toBe(false);
  });
});

describe('money', () => {
  it('formats cents as USD', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
  });

  it('never returns negative remaining', () => {
    expect(remainingCents(100, 250)).toBe(0);
    expect(remainingCents(250, 100)).toBe(150);
  });
});
