import type { LeadVisibilityScope, ManagerScope, RequestContext, Role, SessionUser } from '@/types/auth';

export type LeadStage = 'PROSPECTING' | 'PROPOSAL' | 'CONSISTENCY_CHECK' | 'ADESÃO' | 'CANCELLED';
export type ConsistencyStatus = 'PENDING' | 'VALID' | 'INCONSISTENT';
export type DocumentType = 'RG' | 'CPF' | 'CONTRACT';

export interface ApiError {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'INTERNAL_ERROR';
  message: string;
  details: unknown;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: ApiError;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  isActive: boolean;
}

export interface Pdv {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

export interface Team {
  id: string;
  companyId: string;
  pdvId: string | null;
  name: string;
  isActive: boolean;
}

export type InstallmentStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE';

export interface Installment {
  number: 1 | 2 | 3 | 4;
  status: InstallmentStatus;
  dueDate: string | null;
  receivedDate: string | null;
  value: number;
}

export interface Lead {
  id: string;
  companyId: string;
  pdvId: string | null;
  teamId: string | null;
  ownerMembershipId: string;
  title: string;
  customerName: string;
  customerDocument: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  stage: LeadStage;
  consistencyStatus: ConsistencyStatus;
  consistencyCheckedAt: string | null;
  consistencyCheckedByMembershipId: string | null;
  consistencyNotes: string | null;
  financialTotalValue: number;
  financialCreditValue: number;
  financialDownPayment: number;
  financialMonths: number | null;
  financialInstallmentValue: number | null;
  financialIncome: number | null;
  installments: Installment[];
  soldAt: string | null;
  soldByMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDocument {
  id: string;
  companyId: string;
  leadId: string;
  documentType: DocumentType;
  fileName: string;
  storageKey: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedByMembershipId: string;
  createdAt: string;
}

export interface LeadDetails extends Lead {
  documents: LeadDocument[];
  consistencyIssues: string[];
  flags: {
    color: 'green' | 'yellow' | 'red';
  };
}

export interface ConsistencyCheckResult {
  status: Exclude<ConsistencyStatus, 'PENDING'>;
  issues: string[];
}

export interface LeadConsistencyCheck {
  id: string;
  companyId: string;
  leadId: string;
  status: Exclude<ConsistencyStatus, 'PENDING'>;
  issuesJson: string;
  validatedByMembershipId: string | null;
  validatedAt: string;
  triggerEvent: string;
}

export interface LeadStageEvent {
  id: string;
  companyId: string;
  leadId: string;
  fromStage: LeadStage | null;
  toStage: LeadStage;
  changedByMembershipId: string;
  reason: string | null;
  createdAt: string;
}

export interface SignupInput {
  companyName: string;
  email: string;
  password: string;
}

export interface SignupResult {
  companyId: string;
  ownerMembershipId: string;
}

export type {
  LeadVisibilityScope,
  ManagerScope,
  RequestContext,
  Role,
  SessionUser,
};
