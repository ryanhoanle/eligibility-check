import { describe, expect, it } from 'vitest';
import { buildInMemoryService, FIXED_NOW } from '../test/fixtures.js';
import { PatientNotFoundError } from './EligibilityService.js';

describe('EligibilityService.check', () => {
  it('returns active coverage for a known, current member', async () => {
    const { service } = buildInMemoryService();
    const check = await service.check('pat_001');
    expect(check.result.status).toBe('active');
    if (check.result.status !== 'active') throw new Error('unreachable');
    expect(check.result.coverage.planName).toBe('Delta Dental PPO Plus Premier');
    expect(check.attempts).toBe(1);
    expect(check.serviceDate).toBe('2026-10-06');
    expect(check.createdAt).toBe(FIXED_NOW.toISOString());
  });

  it('returns inactive when coverage terminated before the date of service', async () => {
    const { service } = buildInMemoryService();
    const check = await service.check('pat_004', '2026-10-01');
    expect(check.result.status).toBe('inactive');
    if (check.result.status !== 'inactive') throw new Error('unreachable');
    expect(check.result.terminatedOn).toBe('2026-06-30');
  });

  it('returns active for the same terminated member when the service date is before termination', async () => {
    const { service } = buildInMemoryService();
    const check = await service.check('pat_004', '2026-06-15');
    expect(check.result.status).toBe('active');
  });

  it('returns not-found for an unknown member ID', async () => {
    const { service } = buildInMemoryService();
    const check = await service.check('pat_005');
    expect(check.result.status).toBe('not-found');
  });

  it('retries a retryable transport error and succeeds, recording the attempt count', async () => {
    const { service } = buildInMemoryService({ timeoutFailures: 2 });
    const check = await service.check('pat_006');
    expect(check.result.status).toBe('active');
    expect(check.attempts).toBe(3);
  });

  it('gives up after maxAttempts and records a retryable payer-error', async () => {
    const { service } = buildInMemoryService({ timeoutFailures: 10 });
    const check = await service.check('pat_006');
    expect(check.result.status).toBe('payer-error');
    if (check.result.status !== 'payer-error') throw new Error('unreachable');
    expect(check.result.retryable).toBe(true);
    expect(check.attempts).toBe(3);
  });

  it('does not retry a non-retryable error', async () => {
    const { service } = buildInMemoryService();
    const check = await service.check('pat_007');
    expect(check.result.status).toBe('payer-error');
    if (check.result.status !== 'payer-error') throw new Error('unreachable');
    expect(check.result.retryable).toBe(false);
    expect(check.attempts).toBe(1);
  });

  it('persists every outcome, including failures', async () => {
    const { service, checks } = buildInMemoryService();
    await service.check('pat_001');
    await service.check('pat_007');
    expect(checks.items.map((c) => c.result.status)).toEqual(['active', 'payer-error']);
  });

  it('throws PatientNotFoundError for an unknown patient', async () => {
    const { service } = buildInMemoryService();
    await expect(service.check('nope')).rejects.toBeInstanceOf(PatientNotFoundError);
  });
});
