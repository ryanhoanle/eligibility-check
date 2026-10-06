import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Drizzle schema. SQLite for zero-setup local dev; switching to Postgres is a
 * driver + column-type change (see README → "Production notes").
 */

export const patients = sqliteTable(
  'patients',
  {
    id: text('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dob: text('dob').notNull(),
    payerId: text('payer_id').notNull(),
    memberId: text('member_id').notNull(),
  },
  (t) => [index('patients_last_name_idx').on(t.lastName)],
);

export const eligibilityChecks = sqliteTable(
  'eligibility_checks',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    serviceDate: text('service_date').notNull(),
    /** Denormalised for cheap filtering/aggregation without parsing JSON. */
    status: text('status').notNull(),
    /** Full EligibilityResult, validated against the shared zod schema on read. */
    resultJson: text('result_json').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    attempts: integer('attempts').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('checks_patient_created_idx').on(t.patientId, t.createdAt),
    index('checks_status_idx').on(t.status),
  ],
);

export type PatientRow = typeof patients.$inferSelect;
export type EligibilityCheckRow = typeof eligibilityChecks.$inferSelect;
