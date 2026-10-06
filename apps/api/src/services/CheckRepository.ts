import {
  eligibilityCheckSchema,
  payerIdSchema,
  type EligibilityCheck,
  type Patient,
} from '@eligibility/shared';
import { desc, eq, like, or } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { eligibilityChecks, patients } from '../db/schema.js';

/**
 * Persistence ports. The service depends on these interfaces, not on Drizzle,
 * so unit tests can use the in-memory implementations below and never touch SQL.
 */
export interface PatientRepository {
  findById(id: string): Promise<Patient | null>;
  search(query: string, limit: number): Promise<Patient[]>;
  upsertMany(items: readonly Patient[]): Promise<void>;
}

export interface CheckRepository {
  save(check: EligibilityCheck): Promise<void>;
  findById(id: string): Promise<EligibilityCheck | null>;
  listByPatient(patientId: string, limit: number): Promise<EligibilityCheck[]>;
  listRecent(limit: number): Promise<EligibilityCheck[]>;
}

// ---------------------------------------------------------------------------
// Drizzle / SQLite implementations
// ---------------------------------------------------------------------------

export class DrizzlePatientRepository implements PatientRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Patient | null> {
    const row = this.db.select().from(patients).where(eq(patients.id, id)).get();
    return row ? toPatient(row) : null;
  }

  async search(query: string, limit: number): Promise<Patient[]> {
    const q = `%${query.trim()}%`;
    const rows = this.db
      .select()
      .from(patients)
      .where(or(like(patients.lastName, q), like(patients.firstName, q), like(patients.memberId, q)))
      .orderBy(patients.lastName, patients.firstName)
      .limit(limit)
      .all();
    return rows.map(toPatient);
  }

  async upsertMany(items: readonly Patient[]): Promise<void> {
    for (const p of items) {
      this.db
        .insert(patients)
        .values(p)
        .onConflictDoUpdate({ target: patients.id, set: p })
        .run();
    }
  }
}

export class DrizzleCheckRepository implements CheckRepository {
  constructor(private readonly db: Db) {}

  async save(check: EligibilityCheck): Promise<void> {
    this.db
      .insert(eligibilityChecks)
      .values({
        id: check.id,
        patientId: check.patientId,
        serviceDate: check.serviceDate,
        status: check.result.status,
        resultJson: JSON.stringify(check.result),
        latencyMs: check.latencyMs,
        attempts: check.attempts,
        createdAt: check.createdAt,
      })
      .run();
  }

  async findById(id: string): Promise<EligibilityCheck | null> {
    const row = this.db.select().from(eligibilityChecks).where(eq(eligibilityChecks.id, id)).get();
    return row ? toCheck(row) : null;
  }

  async listByPatient(patientId: string, limit: number): Promise<EligibilityCheck[]> {
    return this.db
      .select()
      .from(eligibilityChecks)
      .where(eq(eligibilityChecks.patientId, patientId))
      .orderBy(desc(eligibilityChecks.createdAt))
      .limit(limit)
      .all()
      .map(toCheck);
  }

  async listRecent(limit: number): Promise<EligibilityCheck[]> {
    return this.db
      .select()
      .from(eligibilityChecks)
      .orderBy(desc(eligibilityChecks.createdAt))
      .limit(limit)
      .all()
      .map(toCheck);
  }
}

function toPatient(row: typeof patients.$inferSelect): Patient {
  // payerId is stored as text; validate it back into the PayerId union rather
  // than casting, so a bad row fails loudly instead of leaking an invalid value.
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    dob: row.dob,
    payerId: payerIdSchema.parse(row.payerId),
    memberId: row.memberId,
  };
}

function toCheck(row: typeof eligibilityChecks.$inferSelect): EligibilityCheck {
  // Parsing on read means a schema change that invalidates stored JSON is
  // caught here, with the row id in the error, rather than in the UI.
  return eligibilityCheckSchema.parse({
    id: row.id,
    patientId: row.patientId,
    serviceDate: row.serviceDate,
    result: JSON.parse(row.resultJson),
    latencyMs: row.latencyMs,
    attempts: row.attempts,
    createdAt: row.createdAt,
  });
}

// ---------------------------------------------------------------------------
// In-memory implementations (unit tests)
// ---------------------------------------------------------------------------

export class InMemoryPatientRepository implements PatientRepository {
  private readonly items = new Map<string, Patient>();

  constructor(seed: readonly Patient[] = []) {
    for (const p of seed) this.items.set(p.id, p);
  }

  async findById(id: string): Promise<Patient | null> {
    return this.items.get(id) ?? null;
  }

  async search(query: string, limit: number): Promise<Patient[]> {
    const q = query.trim().toLowerCase();
    return [...this.items.values()]
      .filter(
        (p) =>
          p.lastName.toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q) ||
          p.memberId.toLowerCase().includes(q),
      )
      .slice(0, limit);
  }

  async upsertMany(items: readonly Patient[]): Promise<void> {
    for (const p of items) this.items.set(p.id, p);
  }
}

export class InMemoryCheckRepository implements CheckRepository {
  readonly items: EligibilityCheck[] = [];

  async save(check: EligibilityCheck): Promise<void> {
    this.items.push(check);
  }

  async findById(id: string): Promise<EligibilityCheck | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async listByPatient(patientId: string, limit: number): Promise<EligibilityCheck[]> {
    return this.items
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listRecent(limit: number): Promise<EligibilityCheck[]> {
    return [...this.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
}
