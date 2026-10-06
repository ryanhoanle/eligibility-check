import type { Patient, PayerId } from '@eligibility/shared';
import type { MockMember } from './MockPayerAdapter.js';

/**
 * Synthetic demo data. Every name, DOB and member ID is invented.
 *
 * The seeded patients map 1:1 to mock payer members so each demo patient
 * exercises a specific code path (see README → "Demo scenarios").
 */

export const demoPatients: readonly Patient[] = [
  { id: 'pat_001', firstName: 'Maria', lastName: 'Alvarez', dob: '1984-03-12', payerId: 'delta-dental', memberId: 'DD-55012' },
  { id: 'pat_002', firstName: 'James', lastName: 'Okafor', dob: '1979-11-02', payerId: 'metlife', memberId: 'ML-88120' },
  { id: 'pat_003', firstName: 'Priya', lastName: 'Natarajan', dob: '1992-07-21', payerId: 'cigna', memberId: 'CG-30455' },
  { id: 'pat_004', firstName: 'Daniel', lastName: 'Brooks', dob: '1968-01-30', payerId: 'delta-dental', memberId: 'DD-55099' },
  { id: 'pat_005', firstName: 'Hannah', lastName: 'Lindqvist', dob: '2001-09-14', payerId: 'metlife', memberId: 'ML-00000' },
  { id: 'pat_006', firstName: 'Tomás', lastName: 'Ferreira', dob: '1990-05-05', payerId: 'cigna', memberId: 'CG-77210-TIMEOUT' },
  { id: 'pat_007', firstName: 'Grace', lastName: 'Whitfield', dob: '1975-12-25', payerId: 'delta-dental', memberId: 'DD-61000-AUTH' },
  { id: 'pat_008', firstName: 'Kenji', lastName: 'Watanabe', dob: '1988-08-08', payerId: 'metlife', memberId: 'ML-88121' },
];

export const mockMembersByPayer: Record<PayerId, readonly MockMember[]> = {
  'delta-dental': [
    {
      memberId: 'DD-55012',
      dob: '1984-03-12',
      coverage: {
        planName: 'Delta Dental PPO Plus Premier',
        effectiveDate: '2024-01-01',
        terminationDate: null,
        annualMaximumCents: 150_000,
        annualUsedCents: 42_500,
        deductibleCents: 5_000,
        deductibleMetCents: 5_000,
        coinsurance: { preventive: 100, basic: 80, major: 50 },
      },
    },
    {
      memberId: 'DD-55099',
      dob: '1968-01-30',
      coverage: {
        planName: 'Delta Dental PPO',
        effectiveDate: '2022-06-01',
        terminationDate: '2026-06-30',
        annualMaximumCents: 100_000,
        annualUsedCents: 0,
        deductibleCents: 5_000,
        deductibleMetCents: 0,
        coinsurance: { preventive: 100, basic: 80, major: 50 },
      },
    },
  ],
  metlife: [
    {
      memberId: 'ML-88120',
      dob: '1979-11-02',
      coverage: {
        planName: 'MetLife PDP Plus',
        effectiveDate: '2025-01-01',
        terminationDate: null,
        annualMaximumCents: 200_000,
        annualUsedCents: 187_300,
        deductibleCents: 7_500,
        deductibleMetCents: 2_000,
        coinsurance: { preventive: 100, basic: 70, major: 50 },
      },
    },
    {
      memberId: 'ML-88121',
      dob: '1988-08-08',
      coverage: {
        planName: 'MetLife PDP',
        effectiveDate: '2026-01-01',
        terminationDate: null,
        annualMaximumCents: 125_000,
        annualUsedCents: 0,
        deductibleCents: 5_000,
        deductibleMetCents: 0,
        coinsurance: { preventive: 100, basic: 80, major: 50 },
      },
    },
  ],
  cigna: [
    {
      memberId: 'CG-30455',
      dob: '1992-07-21',
      coverage: {
        planName: 'Cigna Dental 1500',
        effectiveDate: '2023-03-01',
        terminationDate: null,
        annualMaximumCents: 150_000,
        annualUsedCents: 61_000,
        deductibleCents: 5_000,
        deductibleMetCents: 5_000,
        coinsurance: { preventive: 100, basic: 80, major: 50 },
      },
    },
    {
      memberId: 'CG-77210-TIMEOUT',
      dob: '1990-05-05',
      coverage: {
        planName: 'Cigna Dental 1000',
        effectiveDate: '2024-09-01',
        terminationDate: null,
        annualMaximumCents: 100_000,
        annualUsedCents: 12_000,
        deductibleCents: 5_000,
        deductibleMetCents: 5_000,
        coinsurance: { preventive: 100, basic: 80, major: 50 },
      },
    },
  ],
};
