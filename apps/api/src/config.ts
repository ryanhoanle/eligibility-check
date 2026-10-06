import { z } from 'zod';

/**
 * Environment is validated once at startup. A typo in an env var fails fast
 * with a readable message instead of surfacing as `undefined` deep in a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** better-sqlite3 path. `:memory:` for tests. */
  DATABASE_URL: z.string().default('./data/eligibility.db'),
  /** Comma-separated origins allowed by CORS. */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  /** Simulated payer latency range, ms. Set both to 0 in tests. */
  PAYER_LATENCY_MIN_MS: z.coerce.number().int().nonnegative().default(150),
  PAYER_LATENCY_MAX_MS: z.coerce.number().int().nonnegative().default(600),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}
