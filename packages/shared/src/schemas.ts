import { z } from 'zod';

/**
 * Domain schemas shared by the API and the web client.
 *
 * zod is the single source of truth: the runtime validator and the static
 * type are derived from the same declaration, so the API can never accept a
 * shape the UI doesn't know how to render (and vice versa).
 */

// ---------------------------------------------------------------------------
// Payers
// ---------------------------------------------------------------------------

export const PAYERS = {
  'delta-dental': 'Delta Dental',
  metlife: 'MetLife Dental',
  cigna: 'Cigna Dental',
} as const;

export const payerIdSchema = z.enum(
  Object.keys(PAYERS) as [keyof typeof PAYERS, ...(keyof typeof PAYERS)[]],
);
export type PayerId = z.infer<typeof payerIdSchema>;

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export const patientSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  /** ISO date, YYYY-MM-DD. Kept as a string end-to-end to avoid TZ drift. */
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD'),
  payerId: payerIdSchema,
  memberId: z.string().min(1),
});
export type Patient = z.infer<typeof patientSchema>;

// ---------------------------------------------------------------------------
// Eligibility request
// ---------------------------------------------------------------------------

export const eligibilityRequestSchema = z.object({
  patientId: z.string().min(1),
  /** Date of service. Defaults to today on the server when omitted. */
  serviceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'serviceDate must be YYYY-MM-DD')
    .optional(),
});
export type EligibilityRequest = z.infer<typeof eligibilityRequestSchema>;

// ---------------------------------------------------------------------------
// Eligibility result — a discriminated union on `status`.
//
// Each variant carries only the fields that make sense for it, so the UI
// cannot, for example, read a deductible off an "inactive" response.
// ---------------------------------------------------------------------------

export const coverageSchema = z.object({
  planName: z.string(),
  effectiveDate: z.string(),
  terminationDate: z.string().nullable(),
  annualMaximumCents: z.number().int().nonnegative(),
  annualUsedCents: z.number().int().nonnegative(),
  deductibleCents: z.number().int().nonnegative(),
  deductibleMetCents: z.number().int().nonnegative(),
  /** Coverage percentages by procedure class, 0–100. */
  coinsurance: z.object({
    preventive: z.number().int().min(0).max(100),
    basic: z.number().int().min(0).max(100),
    major: z.number().int().min(0).max(100),
  }),
});
export type Coverage = z.infer<typeof coverageSchema>;

export const eligibilityResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('active'),
    payerId: payerIdSchema,
    memberId: z.string(),
    coverage: coverageSchema,
  }),
  z.object({
    status: z.literal('inactive'),
    payerId: payerIdSchema,
    memberId: z.string(),
    terminatedOn: z.string(),
    reason: z.string(),
  }),
  z.object({
    status: z.literal('not-found'),
    payerId: payerIdSchema,
    memberId: z.string(),
    message: z.string(),
  }),
  z.object({
    status: z.literal('payer-error'),
    payerId: payerIdSchema,
    memberId: z.string(),
    /** Whether a retry is likely to succeed (timeouts yes, auth failures no). */
    retryable: z.boolean(),
    message: z.string(),
  }),
]);
export type EligibilityResult = z.infer<typeof eligibilityResultSchema>;
export type EligibilityStatus = EligibilityResult['status'];

// ---------------------------------------------------------------------------
// A persisted check = request + result + bookkeeping
// ---------------------------------------------------------------------------

export const eligibilityCheckSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  serviceDate: z.string(),
  result: eligibilityResultSchema,
  /** Wall-clock time of the payer call, for SLO dashboards. */
  latencyMs: z.number().int().nonnegative(),
  /** How many payer attempts it took (1 = first try). */
  attempts: z.number().int().positive(),
  createdAt: z.string(),
});
export type EligibilityCheck = z.infer<typeof eligibilityCheckSchema>;

// ---------------------------------------------------------------------------
// API envelopes
// ---------------------------------------------------------------------------

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(['validation', 'not_found', 'internal']),
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const patientListSchema = z.object({ patients: z.array(patientSchema) });
export const checkListSchema = z.object({ checks: z.array(eligibilityCheckSchema) });
