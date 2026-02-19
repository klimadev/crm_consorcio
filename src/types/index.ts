export type Id = string;

export type PDVType = 'PHYSICAL_STORE' | 'KIOSK' | 'CALL_CENTER' | 'ONLINE' | 'PARTNER';

export const PDV_TYPES: Record<PDVType, string> = {
  PHYSICAL_STORE: 'Loja Física',
  KIOSK: 'Quiosque / Shopping',
  CALL_CENTER: 'Call Center',
  ONLINE: 'E-commerce / Digital',
  PARTNER: 'Parceiro Externo'
};

export interface PDV {
  id: Id;
  name: string;
  type: PDVType;
  location: string;
  isActive: boolean;
}

export type Role = 'OWNER' | 'MANAGER' | 'COLLABORATOR';

export interface Employee {
  id: Id;
  name: string;
  email: string;
  role: Role;
  pdvId: Id | null;
  active: boolean;
}

export type CustomerType = 'PF' | 'PJ';
export type CustomerStatus = 'LEAD' | 'PROPONENT' | 'PENDING' | 'ACTIVE' | 'DEFAULTING' | 'CHURN';

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  LEAD: 'Lead',
  PROPONENT: 'Em Aprovação',
  PENDING: 'Aguardando Fábrica',
  ACTIVE: 'Ativo',
  DEFAULTING: 'Inadimplente',
  CHURN: 'Cancelado'
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  LEAD: 'bg-gray-100 text-gray-600',
  PROPONENT: 'bg-blue-100 text-blue-600',
  PENDING: 'bg-orange-100 text-orange-600',
  ACTIVE: 'bg-green-100 text-green-600',
  DEFAULTING: 'bg-red-100 text-red-600',
  CHURN: 'bg-slate-800 text-slate-200'
};

export interface Customer {
  id: Id;
  type: CustomerType;
  name: string;
  document: string;
  email: string;
  phone: string;
  zipCode: string;
  status: CustomerStatus;
  pdvIds: Id[];
  assignedEmployeeIds: Id[];
  customValues?: Record<string, any>;
  createdAt: string;
}

export type PipelineStageType = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: Id;
  name: string;
  color: string;
  type: PipelineStageType;
  orderIndex?: number;
}

export type DealVisibility = 'PUBLIC' | 'RESTRICTED';

export interface Deal {
  id: Id;
  title: string;
  pdvId: Id | null;
  customerId: Id;
  customerName: string;
  value: number;
  stageId: Id;
  visibility: DealVisibility;
  assignedEmployeeIds: Id[];
  customValues?: Record<string, any>;
  notes: string;
  createdAt: string;
}

export type CommercialPeriod = 'month' | 'year' | 'last_30_days' | 'last_90_days';

export interface CommercialDashboardFilters {
  year?: number;
  month?: number | null;
  period?: CommercialPeriod;
  pdvId?: string;
  managerId?: string;
  sellerId?: string;
}

export interface CommercialRankingEntry {
  employeeId: string;
  name: string;
  role: Role;
  pdvId: string | null;
  totalValue: number;
  wonDeals: number;
  avgTicket: number;
}

export interface CommercialDashboardMetrics {
  periodStart: string;
  periodEnd: string;
  totalSalesCount: number;
  totalSalesValue: number;
  avgTicket: number;
  monthlyComparisonPct: number;
  yearlyQuotaCount: number;
  yearlyCreditValue: number;
  yearlyAvgTicket: number;
  yearlyComparisonPct: number;
  evolutionSeries: Array<{ label: string; value: number; count: number }>;
  weekdaySeries: Array<{ weekday: number; label: string; value: number; count: number }>;
  pdvRevenueSeries: Array<{ pdvId: string | null; pdvName: string; value: number; count: number }>;
  ranking: {
    sellers: CommercialRankingEntry[];
    managers: CommercialRankingEntry[];
  };
  insuranceBreakdown: {
    withInsurance: number;
    withoutInsurance: number;
    withInsuranceValue: number;
    withoutInsuranceValue: number;
  };
}

export type {
  DocumentType,
  LeadStage,
  ManagerScope,
  LeadVisibilityScope,
  RequestContext,
  SessionUser,
  SignupInput,
  Lead,
  LeadDetails,
  LeadDocument,
  ConsistencyStatus,
  Company,
  Pdv,
  Team,
  Installment,
  ConsistencyCheckResult,
  LeadConsistencyCheck,
  LeadStageEvent,
  SignupResult,
  ApiError,
  ApiSuccess,
  ApiFailure,
} from './domain';
