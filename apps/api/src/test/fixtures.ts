import { pino } from 'pino';
import { createApp } from '../api/app.js';
import { createDb } from '../db/client.js';
import { MockPayerAdapter } from '../payers/MockPayerAdapter.js';
import { demoPatients, mockMembersByPayer } from '../payers/mockData.js';
import { PayerRegistry } from '../payers/registry.js';
import {
  DrizzleCheckRepository,
  DrizzlePatientRepository,
  InMemoryCheckRepository,
  InMemoryPatientRepository,
} from '../services/CheckRepository.js';
import { EligibilityService } from '../services/EligibilityService.js';

export const FIXED_NOW = new Date('2026-10-06T15:00:00.000Z');

export function buildPayers(timeoutFailures = 2): PayerRegistry {
  return new PayerRegistry()
    .register(new MockPayerAdapter({ payerId: 'delta-dental', members: mockMembersByPayer['delta-dental'], timeoutFailures }))
    .register(new MockPayerAdapter({ payerId: 'metlife', members: mockMembersByPayer.metlife, timeoutFailures }))
    .register(new MockPayerAdapter({ payerId: 'cigna', members: mockMembersByPayer.cigna, timeoutFailures }));
}

/** Service wired to in-memory repos — pure unit-test setup, no SQL. */
export function buildInMemoryService(opts: { timeoutFailures?: number } = {}) {
  const patients = new InMemoryPatientRepository(demoPatients);
  const checks = new InMemoryCheckRepository();
  let seq = 0;
  const service = new EligibilityService({
    patients,
    checks,
    payers: buildPayers(opts.timeoutFailures),
    retry: { sleep: async () => {} },
    now: () => FIXED_NOW,
    newId: () => `chk_${String(++seq).padStart(3, '0')}`,
  });
  return { service, patients, checks };
}

/** Full app on an in-memory SQLite DB — integration-test setup. */
export async function buildTestApp() {
  const db = createDb(':memory:');
  const patients = new DrizzlePatientRepository(db);
  const checks = new DrizzleCheckRepository(db);
  await patients.upsertMany(demoPatients);
  const eligibility = new EligibilityService({
    patients,
    checks,
    payers: buildPayers(),
    retry: { sleep: async () => {} },
  });
  return createApp({
    patients,
    checks,
    eligibility,
    logger: pino({ level: 'silent' }),
    corsOrigins: ['http://localhost:5173'],
  });
}
