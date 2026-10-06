import type { EligibilityCheck } from '@eligibility/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckForm } from './CheckForm.js';

const patient = {
  id: 'pat_001',
  firstName: 'Maria',
  lastName: 'Alvarez',
  dob: '1984-03-12',
  payerId: 'delta-dental',
  memberId: 'DD-55012',
} as const;

const fakeCheck: EligibilityCheck = {
  id: 'chk_1',
  patientId: 'pat_001',
  serviceDate: '2026-10-06',
  result: { status: 'not-found', payerId: 'delta-dental', memberId: 'DD-55012', message: 'nope' },
  latencyMs: 5,
  attempts: 1,
  createdAt: '2026-10-06T15:00:00.000Z',
};

function renderForm(onResult = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CheckForm patient={patient} onResult={onResult} />
    </QueryClientProvider>,
  );
  return { onResult };
}

afterEach(() => vi.restoreAllMocks());

describe('CheckForm', () => {
  it('posts the patient and service date, then reports the result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ check: fakeCheck }), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    const { onResult } = renderForm();

    await userEvent.click(screen.getByRole('button', { name: /run eligibility check/i }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(fakeCheck));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('/api/eligibility');
    expect(JSON.parse(String(init?.body))).toMatchObject({ patientId: 'pat_001' });
  });

  it('shows the API validation message on a 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'validation', message: 'Request failed validation' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: /run eligibility check/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Request failed validation \(validation\)/);
  });
});
