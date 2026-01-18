export type Id = string;

export type PDVType = 'PHYSICAL_STORE' | 'KIOSK' | 'CALL_CENTER' | 'ONLINE' | 'PARTNER';

export const PDV_TYPES: Record<PDVType, string> = {
  PHYSICAL_STORE: 'Loja Física',
  KIOSK: 'Quiosque / Shopping',
  CALL_CENTER: 'Call Center',
  ONLINE: 'E-commerce / Digital',
  PARTNER: 'Parceiro Externo'
};

export interface Region {
  id: Id;
  name: string;
}

export interface PDV {
  id: Id;
  name: string;
  type: PDVType;
  regionId: Id;
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

export type CustomFieldScope = 'DEAL' | 'CUSTOMER';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDefinition {
  id: Id;
  key: string;
  label: string;
  type: CustomFieldType;
  scope: CustomFieldScope;
  options?: string[];
  required: boolean;
  active: boolean;
}

export interface ProductAttribute {
  key: string;
  label: string;
  value: string | number;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required: boolean;
}

export type TimeUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS';

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  MINUTES: 'Minutos',
  HOURS: 'Horas',
  DAYS: 'Dias',
  WEEKS: 'Semanas',
  MONTHS: 'Meses'
};

export interface AutomationStep {
  id: Id;
  name: string;
  delayValue: number;
  delayUnit: TimeUnit;
  messageTemplate: string;
}

export interface Product {
  id: Id;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  attributes: ProductAttribute[];
  formSchema?: FormFieldConfig[];
  automationSteps?: AutomationStep[];
  defaultFollowUpDays?: number;
  active: boolean;
}

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED';

export interface Integration {
  id: Id;
  name: string;
  status: IntegrationStatus;
  type?: string;
  config?: Record<string, any>;
}

export interface Tag {
  id: Id;
  label: string;
  color: string;
}

export type PipelineStageType = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: Id;
  name: string;
  color: string;
  type: PipelineStageType;
  automationSteps?: AutomationStep[];
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
  tags: Tag[];
  notes: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export type WidgetType = 
  | 'KPI_TOTAL_SALES' 
  | 'KPI_ACTIVE_DEALS' 
  | 'KPI_CONVERSION' 
  | 'KPI_AVG_TICKET'
  | 'CHART_FUNNEL' 
  | 'CHART_SALES_BY_REP' 
  | 'LIST_RECENT_DEALS'
  | 'GOAL_PROGRESS';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  colSpan: 1 | 2 | 3 | 4;
}
