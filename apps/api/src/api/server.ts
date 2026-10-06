import { pino } from 'pino';
import { loadConfig } from '../config.js';
import { createDb } from '../db/client.js';
import { MockPayerAdapter } from '../payers/MockPayerAdapter.js';
import { demoPatients, mockMembersByPayer } from '../payers/mockData.js';
import { PayerRegistry } from '../payers/registry.js';
import { DrizzleCheckRepository, DrizzlePatientRepository } from '../services/CheckRepository.js';
import { EligibilityService } from '../services/EligibilityService.js';
import { createApp } from './app.js';

/**
 * Composition root: the only file that knows about concrete implementations.
 */
const config = loadConfig();
const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
});

const db = createDb(config.DATABASE_URL);
const patients = new DrizzlePatientRepository(db);
const checks = new DrizzleCheckRepository(db);

// Idempotent seed so `pnpm dev` works on a fresh clone with no extra step.
await patients.upsertMany(demoPatients);

const latency = { minMs: config.PAYER_LATENCY_MIN_MS, maxMs: config.PAYER_LATENCY_MAX_MS };
const payers = new PayerRegistry()
  .register(new MockPayerAdapter({ payerId: 'delta-dental', members: mockMembersByPayer['delta-dental'], latency }))
  .register(new MockPayerAdapter({ payerId: 'metlife', members: mockMembersByPayer.metlife, latency }))
  .register(new MockPayerAdapter({ payerId: 'cigna', members: mockMembersByPayer.cigna, latency }));

const eligibility = new EligibilityService({ patients, checks, payers });

const app = createApp({
  patients,
  checks,
  eligibility,
  logger,
  corsOrigins: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, db: config.DATABASE_URL }, 'eligibility api listening');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
  });
}
