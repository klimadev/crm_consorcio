import { auth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SALES_MIGRATION_SQL = `
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

    consistency_status TEXT NOT NULL DEFAULT 'AWAITING_CONSISTENCY',
    validated_by TEXT,
    validated_at DATETIME,
    validation_notes TEXT,

    installment_1_status TEXT DEFAULT 'PENDING',
    installment_1_due_date DATETIME,
    installment_1_received_date DATETIME,
    installment_1_value REAL DEFAULT 0,

    installment_2_status TEXT DEFAULT 'PENDING',
    installment_2_due_date DATETIME,
    installment_2_received_date DATETIME,
    installment_2_value REAL DEFAULT 0,

    installment_3_status TEXT DEFAULT 'PENDING',
    installment_3_due_date DATETIME,
    installment_3_received_date DATETIME,
    installment_3_value REAL DEFAULT 0,

    installment_4_status TEXT DEFAULT 'PENDING',
    installment_4_due_date DATETIME,
    installment_4_received_date DATETIME,
    installment_4_value REAL DEFAULT 0,

    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

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
`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin only' }, { status: 403 });
    }

    const db = getDatabase();
    db.exec(SALES_MIGRATION_SQL);

    return NextResponse.json({ success: true, message: 'Sales table migrated successfully' });
  } catch (error) {
    console.error('Sales migration error:', error);
    return NextResponse.json({ success: false, message: 'Migration failed' }, { status: 500 });
  }
}
