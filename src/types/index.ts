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

export type Role = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'SUPPORT';

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

export interface ProductAttribute {
  key: string;
  label: string;
  value: string | number;
}

export interface Product {
  id: Id;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  attributes: ProductAttribute[];
  active: boolean;
}

export type PipelineStageType = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: Id;
  name: string;
  color: string;
  type: PipelineStageType;
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
  productIds: Id[];
  customValues?: Record<string, any>;
  notes: string;
  nextFollowUpDate?: string;
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

// ─── Sale Consistency Types ─────────────────────────────────────

export type SaleConsistencyStatus = 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT';

export const SALE_CONSISTENCY_STATUS_LABELS: Record<SaleConsistencyStatus, string> = {
  AWAITING_CONSISTENCY: 'Aguardando Consistência',
  CONSISTENT: 'Consistente',
  INCONSISTENT: 'Inconsistente',
};

export const SALE_CONSISTENCY_STATUS_COLORS: Record<SaleConsistencyStatus, string> = {
  AWAITING_CONSISTENCY: 'bg-amber-100 text-amber-700',
  CONSISTENT: 'bg-emerald-100 text-emerald-700',
  INCONSISTENT: 'bg-red-100 text-red-700',
};

export type InstallmentStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE';

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  OVERDUE: 'Atrasada',
};

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  RECEIVED: 'bg-green-100 text-green-600',
  OVERDUE: 'bg-red-100 text-red-600',
};

export interface Installment {
  number: 1 | 2 | 3 | 4;
  status: InstallmentStatus;
  dueDate: string | null;
  receivedDate: string | null;
  value: number;
}

export interface Sale {
  id: Id;
  dealId: Id | null;
  customerId: Id | null;
  customerName: string;
  sellerId: Id;
  sellerName: string;
  pdvId: Id | null;
  productId: Id | null;
  productName: string | null;
  totalValue: number;
  creditValue: number;
  planMonths: number | null;
  consistencyStatus: SaleConsistencyStatus;
  validatedBy: Id | null;
  validatedAt: string | null;
  validationNotes: string | null;
  installments: Installment[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
