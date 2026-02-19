PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

-- ============================================================================
-- COMPANIES (Multi-tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'FREE',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Legacy tenants table for backward compatibility
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'COLLABORATOR' CHECK (role IN ('OWNER', 'MANAGER', 'COLLABORATOR')),
  is_active INTEGER NOT NULL DEFAULT 1,
  tenant_id TEXT,
  company_id TEXT,
  pdv_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- MEMBERSHIPS (Company-User relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'COLLABORATOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, user_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_company_role ON memberships(company_id, role, status);

-- ============================================================================
-- SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================================================
-- PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- PDVS (Points of Sale)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pdvs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  company_id TEXT,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT DEFAULT 'PHYSICAL_STORE' CHECK (type IN ('PHYSICAL_STORE', 'KIOSK', 'CALL_CENTER', 'ONLINE', 'PARTNER')),
  location TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  region_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pdvs_tenant ON pdvs(tenant_id, is_active);

-- ============================================================================
-- TEAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  pdv_id TEXT,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id, is_active);

-- ============================================================================
-- TEAM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (team_id, membership_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_members_company_team ON team_members(company_id, team_id);

-- ============================================================================
-- MANAGER SCOPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS manager_scopes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('PDV', 'TEAM')),
  pdv_id TEXT,
  team_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, membership_id, scope_type, pdv_id, team_id),
  CHECK (
    (scope_type = 'PDV' AND pdv_id IS NOT NULL AND team_id IS NULL) OR
    (scope_type = 'TEAM' AND team_id IS NOT NULL AND pdv_id IS NULL)
  ),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_manager_scopes_company_member ON manager_scopes(company_id, membership_id);

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  tenant_id TEXT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'OPEN' CHECK (type IN ('OPEN', 'WON', 'LOST')),
  color TEXT DEFAULT '#3b82f6',
  automation_steps TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company ON pipeline_stages(company_id, order_index);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages(tenant_id, order_index);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pdv_id TEXT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'PJ' CHECK (type IN ('PF', 'PJ')),
  document TEXT,
  email TEXT,
  phone TEXT,
  zip_code TEXT,
  status TEXT DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'PROPONENT', 'PENDING', 'ACTIVE', 'DEFAULTING', 'CHURN')),
  pdv_ids TEXT DEFAULT '[]',
  assigned_employee_ids TEXT DEFAULT '[]',
  custom_values TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pdv_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price REAL DEFAULT 0,
  sku TEXT,
  price REAL DEFAULT 0,
  attributes TEXT DEFAULT '[]',
  form_schema TEXT DEFAULT '[]',
  automation_steps TEXT DEFAULT '[]',
  default_follow_up_days INTEGER,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

-- ============================================================================
-- TAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id);

-- ============================================================================
-- DEALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  pdv_id TEXT,
  product_id TEXT,
  stage_id TEXT NOT NULL,
  title TEXT NOT NULL,
  value REAL DEFAULT 0,
  visibility TEXT DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'RESTRICTED')),
  assigned_employee_ids TEXT DEFAULT '[]',
  product_ids TEXT DEFAULT '[]',
  custom_values TEXT DEFAULT '{}',
  tags TEXT DEFAULT '[]',
  notes TEXT,
  next_follow_up_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);

-- ============================================================================
-- LEADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  pdv_id TEXT,
  team_id TEXT,
  owner_membership_id TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  stage TEXT NOT NULL DEFAULT 'PROSPECTING'
    CHECK (stage IN ('PROSPECTING', 'PROPOSAL', 'CONSISTENCY_CHECK', 'ADESÃO', 'CANCELLED')),
  consistency_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (consistency_status IN ('PENDING', 'VALID', 'INCONSISTENT')),
  consistency_checked_at TEXT,
  consistency_checked_by_membership_id TEXT,
  consistency_notes TEXT,
  financial_total_value REAL NOT NULL DEFAULT 0,
  financial_credit_value REAL NOT NULL DEFAULT 0,
  financial_down_payment REAL NOT NULL DEFAULT 0,
  financial_months INTEGER,
  financial_installment_value REAL,
  financial_income REAL,
  installment_1_status TEXT DEFAULT 'PENDING' CHECK (installment_1_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_1_due_date TEXT,
  installment_1_received_date TEXT,
  installment_1_value REAL DEFAULT 0,
  installment_2_status TEXT DEFAULT 'PENDING' CHECK (installment_2_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_2_due_date TEXT,
  installment_2_received_date TEXT,
  installment_2_value REAL DEFAULT 0,
  installment_3_status TEXT DEFAULT 'PENDING' CHECK (installment_3_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_3_due_date TEXT,
  installment_3_received_date TEXT,
  installment_3_value REAL DEFAULT 0,
  installment_4_status TEXT DEFAULT 'PENDING' CHECK (installment_4_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_4_due_date TEXT,
  installment_4_received_date TEXT,
  installment_4_value REAL DEFAULT 0,
  sold_at TEXT,
  sold_by_membership_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_membership_id) REFERENCES memberships(id) ON DELETE RESTRICT,
  FOREIGN KEY (consistency_checked_by_membership_id) REFERENCES memberships(id) ON DELETE SET NULL,
  FOREIGN KEY (sold_by_membership_id) REFERENCES memberships(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_owner ON leads(company_id, owner_membership_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_pdv ON leads(company_id, pdv_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_team ON leads(company_id, team_id);

-- ============================================================================
-- LEAD DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('RG', 'CPF', 'CONTRACT')),
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INTEGER,
  uploaded_by_membership_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, lead_id, document_type),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_membership_id) REFERENCES memberships(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_documents_company_lead ON lead_documents(company_id, lead_id);

-- ============================================================================
-- LEAD CONSISTENCY CHECKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_consistency_checks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VALID', 'INCONSISTENT')),
  issues_json TEXT NOT NULL,
  validated_by_membership_id TEXT,
  validated_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger_event TEXT NOT NULL DEFAULT 'STAGE_CHANGE',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by_membership_id) REFERENCES memberships(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consistency_company_lead_time ON lead_consistency_checks(company_id, lead_id, validated_at DESC);

-- ============================================================================
-- LEAD STAGE EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_stage_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by_membership_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_membership_id) REFERENCES memberships(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_stage_events_company_lead_time ON lead_stage_events(company_id, lead_id, created_at DESC);

-- ============================================================================
-- SALES (Consistency & Installment Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  deal_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  pdv_id TEXT,
  product_id TEXT,
  product_name TEXT,
  total_value REAL NOT NULL DEFAULT 0,
  credit_value REAL DEFAULT 0,
  plan_months INTEGER,
  consistency_status TEXT NOT NULL DEFAULT 'AWAITING_CONSISTENCY'
    CHECK (consistency_status IN ('AWAITING_CONSISTENCY', 'CONSISTENT', 'INCONSISTENT')),
  validated_by TEXT,
  validated_at TEXT,
  validation_notes TEXT,
  installment_1_status TEXT DEFAULT 'PENDING' CHECK (installment_1_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_1_due_date TEXT,
  installment_1_received_date TEXT,
  installment_1_value REAL DEFAULT 0,
  installment_2_status TEXT DEFAULT 'PENDING' CHECK (installment_2_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_2_due_date TEXT,
  installment_2_received_date TEXT,
  installment_2_value REAL DEFAULT 0,
  installment_3_status TEXT DEFAULT 'PENDING' CHECK (installment_3_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_3_due_date TEXT,
  installment_3_received_date TEXT,
  installment_3_value REAL DEFAULT 0,
  installment_4_status TEXT DEFAULT 'PENDING' CHECK (installment_4_status IN ('PENDING', 'RECEIVED', 'OVERDUE')),
  installment_4_due_date TEXT,
  installment_4_received_date TEXT,
  installment_4_value REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_status ON sales(tenant_id, consistency_status);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(tenant_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_deal ON sales(deal_id);

-- ============================================================================
-- CUSTOM FIELD DEFINITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'boolean')),
  scope TEXT NOT NULL CHECK (scope IN ('DEAL', 'CUSTOMER')),
  options TEXT DEFAULT '[]',
  required INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON custom_field_definitions(tenant_id);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'DISCONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED')),
  config TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- ============================================================================
-- DASHBOARD WIDGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  col_span INTEGER DEFAULT 1,
  config TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant ON dashboard_widgets(tenant_id);
