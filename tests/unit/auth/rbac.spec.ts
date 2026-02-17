import { describe, expect, it } from 'vitest';
import { assertCanViewLead, buildLeadVisibilityScope } from '@/lib/auth/rbac';
import { AppError } from '@/lib/http/errors';
import type { Lead, RequestContext } from '@/types';

const sampleLead: Lead = {
  id: 'lead-1',
  companyId: 'company-1',
  pdvId: 'pdv-1',
  teamId: 'team-1',
  ownerMembershipId: 'mem-collab-1',
  title: 'Lead 1',
  customerName: 'Customer',
  customerDocument: null,
  customerEmail: null,
  customerPhone: null,
  stage: 'PROSPECTING',
  consistencyStatus: 'PENDING',
  consistencyCheckedAt: null,
  consistencyCheckedByMembershipId: null,
  consistencyNotes: null,
  financialTotalValue: 0,
  financialCreditValue: 0,
  financialDownPayment: 0,
  financialMonths: null,
  financialInstallmentValue: null,
  financialIncome: null,
  installments: [
    { number: 1, status: 'PENDING', dueDate: null, receivedDate: null, value: 0 },
    { number: 2, status: 'PENDING', dueDate: null, receivedDate: null, value: 0 },
    { number: 3, status: 'PENDING', dueDate: null, receivedDate: null, value: 0 },
    { number: 4, status: 'PENDING', dueDate: null, receivedDate: null, value: 0 },
  ],
  soldAt: null,
  soldByMembershipId: null,
  createdAt: '',
  updatedAt: '',
};

function context(role: RequestContext['role'], membershipId = 'mem-owner'): RequestContext {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    membershipId,
    role,
  };
}

describe('rbac lead visibility', () => {
  it('owner can view all leads in same company', () => {
    const ctx = context('OWNER');
    const scope = buildLeadVisibilityScope(ctx, []);
    expect(() => assertCanViewLead(ctx, sampleLead, scope)).not.toThrow();
  });

  it('manager with pdv scope sees scoped lead', () => {
    const ctx = context('MANAGER', 'mem-manager');
    const scope = buildLeadVisibilityScope(ctx, [{ scopeType: 'PDV', pdvId: 'pdv-1', teamId: null }]);
    expect(() => assertCanViewLead(ctx, sampleLead, scope)).not.toThrow();
  });

  it('collaborator sees own lead only', () => {
    const ctx = context('COLLABORATOR', 'mem-collab-1');
    const scope = buildLeadVisibilityScope(ctx, []);
    expect(() => assertCanViewLead(ctx, sampleLead, scope)).not.toThrow();

    const foreignLead = { ...sampleLead, ownerMembershipId: 'mem-collab-2' };
    expect(() => assertCanViewLead(ctx, foreignLead, scope)).toThrow(AppError);
  });

  it('cross-company access is denied', () => {
    const ctx = context('OWNER');
    const scope = buildLeadVisibilityScope(ctx, []);
    const foreignLead = { ...sampleLead, companyId: 'company-2' };
    expect(() => assertCanViewLead(ctx, foreignLead, scope)).toThrow(AppError);
  });
});
