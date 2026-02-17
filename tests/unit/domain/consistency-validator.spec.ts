import { describe, expect, it } from 'vitest';
import { validateLeadForConsistency } from '@/lib/domain/leads/consistency-validator';

describe('consistency validator', () => {
  it('returns VALID when all rules pass', () => {
    const result = validateLeadForConsistency({
      docs: [{ documentType: 'RG' }, { documentType: 'CPF' }, { documentType: 'CONTRACT' }],
      financial: {
        totalValue: 100000,
        creditValue: 60000,
        downPayment: 20000,
        months: 120,
        installmentValue: 500,
      },
    });

    expect(result.status).toBe('VALID');
    expect(result.issues).toEqual([]);
  });

  it('returns deterministic ordered issues', () => {
    const result = validateLeadForConsistency({
      docs: [{ documentType: 'RG' }],
      financial: {
        totalValue: 0,
        creditValue: -1,
        downPayment: -1,
        months: 241,
        installmentValue: 0,
      },
    });

    expect(result.status).toBe('INCONSISTENT');
    expect(result.issues).toEqual([
      'Missing required document: CPF',
      'Missing required document: CONTRACT',
      'Total value must be greater than zero.',
      'Credit value must be zero or positive.',
      'Down payment must be zero or positive.',
      'Plan months must be an integer between 1 and 240.',
      'Installment value must be greater than zero.',
    ]);
  });
});
