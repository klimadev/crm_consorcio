PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'FREE',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'COLLABORATOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, user_id),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdvs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  UNIQUE (company_id, name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  pdv_id TEXT,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  UNIQUE (company_id, name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, pdv_id) REFERENCES pdvs(company_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  UNIQUE (team_id, membership_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, team_id) REFERENCES teams(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manager_scopes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('PDV', 'TEAM')),
  pdv_id TEXT,
  team_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  UNIQUE (company_id, membership_id, scope_type, pdv_id, team_id),
  CHECK (
    (scope_type = 'PDV' AND pdv_id IS NOT NULL AND team_id IS NULL) OR
    (scope_type = 'TEAM' AND team_id IS NOT NULL AND pdv_id IS NULL)
  ),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, pdv_id) REFERENCES pdvs(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, team_id) REFERENCES teams(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'OPEN' CHECK (type IN ('OPEN', 'WON', 'LOST')),
  color TEXT DEFAULT '#3b82f6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  UNIQUE (company_id, name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

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
  -- Installment tracking for sold leads
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
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, pdv_id) REFERENCES pdvs(company_id, id) ON DELETE SET NULL,
  FOREIGN KEY (company_id, team_id) REFERENCES teams(company_id, id) ON DELETE SET NULL,
  FOREIGN KEY (company_id, owner_membership_id) REFERENCES memberships(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, consistency_checked_by_membership_id) REFERENCES memberships(company_id, id) ON DELETE SET NULL,
  FOREIGN KEY (company_id, sold_by_membership_id) REFERENCES memberships(company_id, id) ON DELETE SET NULL
);

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
  UNIQUE (company_id, id),
  UNIQUE (company_id, lead_id, document_type),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, lead_id) REFERENCES leads(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, uploaded_by_membership_id) REFERENCES memberships(company_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lead_consistency_checks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VALID', 'INCONSISTENT')),
  issues_json TEXT NOT NULL,
  validated_by_membership_id TEXT,
  validated_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger_event TEXT NOT NULL DEFAULT 'STAGE_CHANGE',
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, lead_id) REFERENCES leads(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, validated_by_membership_id) REFERENCES memberships(company_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_stage_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by_membership_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, lead_id) REFERENCES leads(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, changed_by_membership_id) REFERENCES memberships(company_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_memberships_company_role ON memberships(company_id, role, status);
CREATE INDEX IF NOT EXISTS idx_pdvs_company ON pdvs(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_company_team ON team_members(company_id, team_id);
CREATE INDEX IF NOT EXISTS idx_manager_scopes_company_member ON manager_scopes(company_id, membership_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company ON pipeline_stages(company_id, order_index);
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_owner ON leads(company_id, owner_membership_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_pdv ON leads(company_id, pdv_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_team ON leads(company_id, team_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_sold ON leads(company_id, stage, sold_at) WHERE stage = 'SOLD';
CREATE INDEX IF NOT EXISTS idx_documents_company_lead ON lead_documents(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_consistency_company_lead_time ON lead_consistency_checks(company_id, lead_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_events_company_lead_time ON lead_stage_events(company_id, lead_id, created_at DESC);
