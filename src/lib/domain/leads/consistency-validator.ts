import type { ConsistencyCheckResult, DocumentType } from '@/types';

const REQUIRED_DOCS: DocumentType[] = ['RG', 'CPF', 'CONTRACT'];

interface ValidatorInput {
  docs: Array<{ documentType: DocumentType }>;
  financial: {
    totalValue: number;
    creditValue: number;
    downPayment: number;
    months: number | null;
    installmentValue: number | null;
  };
}

export function validateLeadForConsistency(input: ValidatorInput): ConsistencyCheckResult {
  const issues: string[] = [];

  for (const required of REQUIRED_DOCS) {
    const found = input.docs.some((doc) => doc.documentType === required);
    if (!found) {
      issues.push(`Missing required document: ${required}`);
    }
  }

  if (!(input.financial.totalValue > 0)) {
    issues.push('Total value must be greater than zero.');
  }

  if (!(input.financial.creditValue >= 0)) {
    issues.push('Credit value must be zero or positive.');
  }

  if (!(input.financial.downPayment >= 0)) {
    issues.push('Down payment must be zero or positive.');
  }

  if (
    !(
      Number.isInteger(input.financial.months) &&
      (input.financial.months as number) >= 1 &&
      (input.financial.months as number) <= 240
    )
  ) {
    issues.push('Plan months must be an integer between 1 and 240.');
  }

  if (!((input.financial.installmentValue ?? 0) > 0)) {
    issues.push('Installment value must be greater than zero.');
  }

  if (input.financial.creditValue + input.financial.downPayment > input.financial.totalValue) {
    issues.push('Credit value plus down payment cannot exceed total value.');
  }

  return {
    status: issues.length === 0 ? 'VALID' : 'INCONSISTENT',
    issues,
  };
}
