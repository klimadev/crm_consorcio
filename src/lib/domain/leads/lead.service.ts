import type Database from 'better-sqlite3';
import { documentRepository } from '@/lib/db/repositories/document.repository';
import { leadRepository } from '@/lib/db/repositories/lead.repository';
import { runInTransaction } from '@/lib/db/tx';
import { assertCanCreateLead, assertCanMoveLeadStage, assertCanViewLead, loadVisibilityScope } from '@/lib/auth/rbac';
import { AppError } from '@/lib/http/errors';
import { validateLeadForConsistency } from '@/lib/domain/leads/consistency-validator';
import { isStageTransitionAllowed } from '@/lib/domain/leads/stage-policy';
import type { DocumentType, Lead, LeadStage, RequestContext } from '@/types';

interface CreateLeadInput {
  title: string;
  customerName: string;
  customerDocument?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  pdvId?: string | null;
  teamId?: string | null;
  ownerMembershipId?: string;
  financialTotalValue?: number;
  financialCreditValue?: number;
  financialDownPayment?: number;
  financialMonths?: number | null;
  financialInstallmentValue?: number | null;
  financialIncome?: number | null;
}

export function createLead(db: Database.Database, ctx: RequestContext, input: CreateLeadInput): Lead {
  assertCanCreateLead(ctx, { ownerMembershipId: input.ownerMembershipId });

  const ownerMembershipId = ctx.role === 'COLLABORATOR' ? ctx.membershipId : input.ownerMembershipId ?? ctx.membershipId;
  return leadRepository.create(db, {
    id: crypto.randomUUID(),
    companyId: ctx.companyId,
    ownerMembershipId,
    title: input.title,
    customerName: input.customerName,
    customerDocument: input.customerDocument,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    pdvId: input.pdvId,
    teamId: input.teamId,
    financialTotalValue: input.financialTotalValue,
    financialCreditValue: input.financialCreditValue,
    financialDownPayment: input.financialDownPayment,
    financialMonths: input.financialMonths,
    financialInstallmentValue: input.financialInstallmentValue,
    financialIncome: input.financialIncome,
  });
}

export function listLeads(db: Database.Database, ctx: RequestContext): Lead[] {
  const scope = loadVisibilityScope(db, ctx);
  return leadRepository.listByScope(db, ctx.companyId, scope);
}

export function getLead(db: Database.Database, ctx: RequestContext, leadId: string): Lead {
  const lead = leadRepository.findById(db, ctx.companyId, leadId);
  if (!lead) {
    throw new AppError('NOT_FOUND', 'Lead not found.', 404);
  }

  const scope = loadVisibilityScope(db, ctx);
  assertCanViewLead(ctx, lead, scope);
  return lead;
}

export function updateLead(db: Database.Database, ctx: RequestContext, leadId: string, input: Partial<CreateLeadInput>): Lead {
  const lead = getLead(db, ctx, leadId);
  const scope = loadVisibilityScope(db, ctx);
  assertCanViewLead(ctx, lead, scope);

  leadRepository.update(db, {
    companyId: ctx.companyId,
    leadId,
    title: input.title,
    customerName: input.customerName,
    customerDocument: input.customerDocument,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    pdvId: input.pdvId,
    teamId: input.teamId,
    financialTotalValue: input.financialTotalValue,
    financialCreditValue: input.financialCreditValue,
    financialDownPayment: input.financialDownPayment,
    financialMonths: input.financialMonths,
    financialInstallmentValue: input.financialInstallmentValue,
    financialIncome: input.financialIncome,
  });

  const updatedLead = leadRepository.findById(db, ctx.companyId, leadId);
  if (!updatedLead) {
    throw new AppError('NOT_FOUND', 'Lead not found.', 404);
  }

  return updatedLead;
}

export function upsertLeadDocument(
  db: Database.Database,
  ctx: RequestContext,
  leadId: string,
  input: { documentType: DocumentType; fileName: string; storageKey: string; mimeType?: string; fileSizeBytes?: number },
): void {
  getLead(db, ctx, leadId);

  documentRepository.upsert(db, {
    id: crypto.randomUUID(),
    companyId: ctx.companyId,
    leadId,
    documentType: input.documentType,
    fileName: input.fileName,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    uploadedByMembershipId: ctx.membershipId,
  });
}

export function removeLeadDocument(db: Database.Database, ctx: RequestContext, leadId: string, documentType: DocumentType): void {
  getLead(db, ctx, leadId);
  documentRepository.deleteByType(db, {
    companyId: ctx.companyId,
    leadId,
    documentType,
  });
}

export function getLeadDetails(db: Database.Database, ctx: RequestContext, leadId: string) {
  const lead = getLead(db, ctx, leadId);
  const docs = documentRepository.listByLead(db, ctx.companyId, leadId);
  const history = leadRepository.listConsistencyHistory(db, ctx.companyId, leadId);
  const latest = history[0] as { issues_json?: string; issuesJson?: string } | undefined;
  const issuesJson = latest?.issues_json ?? latest?.issuesJson;
  const issues = issuesJson ? (JSON.parse(issuesJson) as string[]) : [];

  return {
    ...lead,
    documents: docs,
    consistencyIssues: issues,
    flags: {
      color: lead.consistencyStatus === 'VALID' ? 'green' : lead.consistencyStatus === 'INCONSISTENT' ? 'red' : 'yellow',
    },
  };
}

function calculateInstallments(totalValue: number, months: number | null): Array<{ number: 1 | 2 | 3 | 4; dueDate: string; value: number }> {
  const installmentValue = Math.round((totalValue / 4) * 100) / 100;
  const now = new Date();
  
  return [1, 2, 3, 4].map((n) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (n * 30));
    return {
      number: n as 1 | 2 | 3 | 4,
      dueDate: dueDate.toISOString(),
      value: installmentValue,
    };
  });
}

export function moveLeadStage(
  db: Database.Database,
  ctx: RequestContext,
  leadId: string,
  nextStage: LeadStage,
  reason?: string,
) {
  return runInTransaction(db, () => {
    const lead = getLead(db, ctx, leadId);
    assertCanMoveLeadStage(ctx, lead, nextStage);

    if (!isStageTransitionAllowed(lead.stage, nextStage)) {
      throw new AppError('VALIDATION_ERROR', `Transition ${lead.stage} -> ${nextStage} is not allowed.`, 422);
    }

    let consistencyIssues: string[] = [];
    let nextConsistencyStatus = lead.consistencyStatus;
    let consistencyNotes: string | null = lead.consistencyNotes;
    let consistencyCheckedAt = lead.consistencyCheckedAt;
    let consistencyCheckedByMembershipId = lead.consistencyCheckedByMembershipId;

    if (nextStage === 'CONSISTENCY_CHECK') {
      const docs = documentRepository.listByLead(db, ctx.companyId, leadId).map((doc) => ({
        documentType: doc.documentType,
      }));

      const validation = validateLeadForConsistency({
        docs,
        financial: {
          totalValue: lead.financialTotalValue,
          creditValue: lead.financialCreditValue,
          downPayment: lead.financialDownPayment,
          months: lead.financialMonths,
          installmentValue: lead.financialInstallmentValue,
        },
      });

      consistencyIssues = validation.issues;
      nextConsistencyStatus = validation.status;
      consistencyCheckedAt = new Date().toISOString();
      consistencyCheckedByMembershipId = ctx.membershipId;
      consistencyNotes = consistencyIssues.join('\n') || null;

      leadRepository.insertConsistencyCheck(db, {
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        leadId,
        status: validation.status,
        issuesJson: JSON.stringify(consistencyIssues),
        validatedByMembershipId: ctx.membershipId,
      });
    }

    // If moving to ADESÃO, create sale record with installments
    if (nextStage === 'ADESÃO') {
      const installments = calculateInstallments(lead.financialTotalValue, lead.financialMonths);
      leadRepository.markAsSold(db, {
        companyId: ctx.companyId,
        leadId,
        soldByMembershipId: ctx.membershipId,
        installments,
      });
    } else {
      leadRepository.updateStage(db, {
        companyId: ctx.companyId,
        leadId,
        stage: nextStage,
        consistencyStatus: nextConsistencyStatus,
        consistencyNotes,
        consistencyCheckedAt,
        consistencyCheckedByMembershipId,
      });
    }

    leadRepository.insertStageEvent(db, {
      id: crypto.randomUUID(),
      companyId: ctx.companyId,
      leadId,
      fromStage: lead.stage,
      toStage: nextStage,
      changedByMembershipId: ctx.membershipId,
      reason,
    });

    const updated = leadRepository.findById(db, ctx.companyId, leadId);
    if (!updated) {
      throw new AppError('NOT_FOUND', 'Lead not found after stage transition.', 404);
    }

    return {
      lead: updated,
      consistencyIssues,
    };
  });
}

export function updateLeadInstallment(
  db: Database.Database,
  ctx: RequestContext,
  leadId: string,
  installmentNumber: 1 | 2 | 3 | 4,
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE',
  receivedDate?: string,
) {
  const lead = getLead(db, ctx, leadId);
  
  if (lead.stage !== 'ADESÃO') {
    throw new AppError('VALIDATION_ERROR', 'Can only update installments for leads in ADESÃO stage.', 422);
  }

  leadRepository.updateInstallment(db, {
    companyId: ctx.companyId,
    leadId,
    installmentNumber,
    status,
    receivedDate: receivedDate ?? null,
  });

  return leadRepository.findById(db, ctx.companyId, leadId);
}

export function listSoldLeads(db: Database.Database, ctx: RequestContext): Lead[] {
  // Check permission to view sold leads
  const scope = loadVisibilityScope(db, ctx);
  const allSold = leadRepository.listSold(db, ctx.companyId);
  
  // Filter based on scope
  if (scope.kind === 'all') {
    return allSold;
  }
  
  if (scope.kind === 'ownerOnly') {
    return allSold.filter(lead => lead.ownerMembershipId === scope.ownerMembershipId);
  }
  
  const pdvIds = scope.pdvIds ?? [];
  const teamIds = scope.teamIds ?? [];
  
  return allSold.filter(lead => {
    if (lead.pdvId && pdvIds.includes(lead.pdvId)) return true;
    if (lead.teamId && teamIds.includes(lead.teamId)) return true;
    return false;
  });
}
