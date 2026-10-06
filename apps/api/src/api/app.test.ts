import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../test/fixtures.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;

beforeAll(async () => {
  app = await buildTestApp();
});

describe('GET /health', () => {
  it('responds ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /patients', () => {
  it('searches by last name, case-insensitively', async () => {
    const res = await request(app).get('/patients').query({ q: 'alva' });
    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(1);
    expect(res.body.patients[0].lastName).toBe('Alvarez');
  });

  it('rejects an over-long query', async () => {
    const res = await request(app).get('/patients').query({ q: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');
  });
});

describe('POST /eligibility', () => {
  it('runs a check and persists it (201)', async () => {
    const res = await request(app).post('/eligibility').send({ patientId: 'pat_001' });
    expect(res.status).toBe(201);
    expect(res.body.check.result.status).toBe('active');

    const byId = await request(app).get(`/checks/${res.body.check.id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.check.id).toBe(res.body.check.id);
  });

  it('returns 400 with field-level issues for an invalid body', async () => {
    const res = await request(app).post('/eligibility').send({ patientId: '', serviceDate: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');
    const paths = res.body.error.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['patientId', 'serviceDate']));
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/eligibility').set('Content-Type', 'application/json').send('{"patientId":');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown patient', async () => {
    const res = await request(app).post('/eligibility').send({ patientId: 'pat_999' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('surfaces a payer failure as a 201 with a typed payer-error result', async () => {
    const res = await request(app).post('/eligibility').send({ patientId: 'pat_007' });
    expect(res.status).toBe(201);
    expect(res.body.check.result).toMatchObject({ status: 'payer-error', retryable: false });
  });
});

describe('GET /checks', () => {
  it('lists a patient’s checks newest first', async () => {
    await request(app).post('/eligibility').send({ patientId: 'pat_002', serviceDate: '2026-01-01' });
    await request(app).post('/eligibility').send({ patientId: 'pat_002', serviceDate: '2026-02-01' });
    const res = await request(app).get('/checks').query({ patientId: 'pat_002', limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.checks.length).toBeGreaterThanOrEqual(2);
    const dates = res.body.checks.map((c: { createdAt: string }) => c.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe('unknown route', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
