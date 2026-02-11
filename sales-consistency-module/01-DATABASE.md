# Step 01 — Database Migration

## Overview

Create a new `sales` table to store sale submissions, their consistency status, and the 4 installment tracking fields. This is a **separate table from `deals`** to avoid polluting the existing pipeline with validation-specific logic.

> **Why a separate table?** The `deals` table serves the Kanban pipeline with stages (OPEN/WON/LOST). Sales validation has its own lifecycle (AWAITING → CONSISTENT/INCONSISTENT) and installment tracking. Mixing them would create confusion and break existing dashboard metrics.

---

## Migration Script

### Location: `src/lib/db/client.ts`

Add the following `CREATE TABLE IF NOT EXISTS` statement inside the `dbInstance.exec(...)` block in the `initDb()` function, **after** the existing `deals` table creation:

```sql
-- Sales Consistency & Installment Tracking table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  
  -- Sale core data
  deal_id TEXT,                          -- Optional link to existing deal
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  seller_id TEXT NOT NULL,               -- Employee who submitted the sale
  seller_name TEXT NOT NULL,
  pdv_id TEXT,
  product_id TEXT,
  product_name TEXT,
  
  -- Financial summary
  total_value REAL NOT NULL DEFAULT 0,
  credit_value REAL DEFAULT 0,           -- Carta de crédito value
  plan_months INTEGER,                   -- Plan duration in months
  
  -- Consistency validation
  consistency_status TEXT NOT NULL DEFAULT 'AWAITING_CONSISTENCY',
  -- Allowed values: 'AWAITING_CONSISTENCY', 'CONSISTENT', 'INCONSISTENT'
  validated_by TEXT,                      -- User ID of the validator
  validated_at DATETIME,                 -- Timestamp of validation
  validation_notes TEXT,                  -- Reason for inconsistency or approval notes
  
  -- Installment 1
  installment_1_status TEXT DEFAULT 'PENDING',
  installment_1_due_date DATETIME,
  installment_1_received_date DATETIME,
  installment_1_value REAL DEFAULT 0,
  
  -- Installment 2
  installment_2_status TEXT DEFAULT 'PENDING',
  installment_2_due_date DATETIME,
  installment_2_received_date DATETIME,
  installment_2_value REAL DEFAULT 0,
  
  -- Installment 3
  installment_3_status TEXT DEFAULT 'PENDING',
  installment_3_due_date DATETIME,
  installment_3_received_date DATETIME,
  installment_3_value REAL DEFAULT 0,
  
  -- Installment 4
  installment_4_status TEXT DEFAULT 'PENDING',
  installment_4_due_date DATETIME,
  installment_4_received_date DATETIME,
  installment_4_value REAL DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
```

### Indexes (add after the CREATE TABLE)

```sql
-- Index for fast filtering by tenant + status
CREATE INDEX IF NOT EXISTS idx_sales_tenant_status 
  ON sales(tenant_id, consistency_status);

-- Index for filtering by seller
CREATE INDEX IF NOT EXISTS idx_sales_seller 
  ON sales(tenant_id, seller_id);

-- Index for linking to deals
CREATE INDEX IF NOT EXISTS idx_sales_deal 
  ON sales(deal_id);
```

---

## Migration for Existing Databases

Since the project uses `CREATE TABLE IF NOT EXISTS`, the table will be created automatically on next server start. **No separate migration script is needed** — this matches the existing pattern in `client.ts`.

For safety, the AI implementer should also add a standalone migration function:

### Location: `src/app/api/db/migrate-sales/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(accessToken);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin only' }, { status: 403 });
    }

    const db = getDatabase();
    
    // The CREATE TABLE IF NOT EXISTS in client.ts handles this automatically,
    // but this endpoint allows explicit re-run for safety
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        /* ... same schema as above ... */
      );
      CREATE INDEX IF NOT EXISTS idx_sales_tenant_status ON sales(tenant_id, consistency_status);
      CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(tenant_id, seller_id);
      CREATE INDEX IF NOT EXISTS idx_sales_deal ON sales(deal_id);
    `);

    return NextResponse.json({ success: true, message: 'Sales table migrated successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, message: 'Migration failed' }, { status: 500 });
  }
}
```

---

## Design Decisions

1. **Flat installment columns vs. separate table**: Using flat columns (`installment_1_*`, `installment_2_*`, etc.) because the requirement is explicitly for exactly 4 installments. This avoids JOIN complexity and matches the simplicity of the existing schema patterns.

2. **`seller_name` denormalization**: Stored alongside `seller_id` for fast display in the validator dashboard without JOINs, matching the existing `customer_name` pattern in the `deals` table.

3. **Optional `deal_id` link**: A sale CAN optionally link to an existing deal in the Kanban pipeline, but it's not required. This allows the validation flow to exist independently.
