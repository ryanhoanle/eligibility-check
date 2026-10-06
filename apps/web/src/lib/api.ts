import {
  apiErrorSchema,
  checkListSchema,
  eligibilityCheckSchema,
  patientListSchema,
  type EligibilityCheck,
  type EligibilityRequest,
  type Patient,
} from '@eligibility/shared';
import { z } from 'zod';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/**
 * Every response is parsed with the shared zod schema. If the API ever ships a
 * shape the UI doesn't expect, it fails here with a clear message instead of
 * rendering `undefined` somewhere three components deep.
 */
async function call<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) {
      const { code, message, issues } = parsed.data.error;
      throw new ApiRequestError(res.status, code, message, issues ?? []);
    }
    throw new ApiRequestError(res.status, 'internal', `Request failed with ${res.status}`);
  }

  return schema.parse(body);
}

export const api = {
  searchPatients(q: string): Promise<Patient[]> {
    const params = new URLSearchParams({ limit: '10' });
    if (q.trim()) params.set('q', q.trim());
    return call(`/patients?${params}`, patientListSchema).then((r) => r.patients);
  },

  runCheck(req: EligibilityRequest): Promise<EligibilityCheck> {
    return call('/eligibility', z.object({ check: eligibilityCheckSchema }), {
      method: 'POST',
      body: JSON.stringify(req),
    }).then((r) => r.check);
  },

  listChecks(patientId: string): Promise<EligibilityCheck[]> {
    const params = new URLSearchParams({ patientId, limit: '20' });
    return call(`/checks?${params}`, checkListSchema).then((r) => r.checks);
  },
};
