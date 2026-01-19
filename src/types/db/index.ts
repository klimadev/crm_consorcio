export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'SUPPORT';
  pdv_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  session_token: string;
  user_id: string;
  tenant_id: string;
  expires: string;
  created_at: string;
}

export interface Region {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PDV {
  id: string;
  tenant_id: string;
  name: string;
  type: 'PHYSICAL_STORE' | 'KIOSK' | 'CALL_CENTER' | 'ONLINE' | 'PARTNER';
  region_id: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  type: 'PF' | 'PJ';
  name: string;
  document: string;
  email: string;
  phone: string;
  zip_code: string;
  status: 'LEAD' | 'PROPONENT' | 'PENDING' | 'ACTIVE' | 'DEFAULTING' | 'CHURN';
  pdv_ids: string;
  assigned_employee_ids: string;
  custom_values: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  attributes: string;
  form_schema: string;
  automation_steps: string;
  default_follow_up_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  type: 'OPEN' | 'WON' | 'LOST';
  automation_steps: string;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  tenant_id: string;
  label: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  title: string;
  pdv_id: string | null;
  customer_id: string;
  customer_name: string;
  value: number;
  stage_id: string;
  visibility: 'PUBLIC' | 'RESTRICTED';
  assigned_employee_ids: string;
  product_ids: string;
  custom_values: string;
  tags: string;
  notes: string;
  next_follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  config: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  tenant_id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  scope: 'DEAL' | 'CUSTOMER';
  options: string;
  required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  col_span: number;
  config: string;
  created_at: string;
  updated_at: string;
}
