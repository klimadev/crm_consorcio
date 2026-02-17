import type Database from 'better-sqlite3';
import type {
  ConsistencyStatus,
  Lead,
  LeadConsistencyCheck,
  LeadStage,
  LeadStageEvent,
  LeadVisibilityScope,
} from '@/types';

type InstallmentStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE';

interface LeadRow {
  id: string;
  company_id: string;
  pdv_id: string | null;
  team_id: string | null;
  owner_membership_id: string;
  title: string;
  customer_name: string;
  customer_document: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  stage: LeadStage;
  consistency_status: ConsistencyStatus;
  consistency_checked_at: string | null;
  consistency_checked_by_membership_id: string | null;
  consistency_notes: string | null;
  financial_total_value: number;
  financial_credit_value: number;
  financial_down_payment: number;
  financial_months: number | null;
  financial_installment_value: number | null;
  financial_income: number | null;
  installment_1_status: InstallmentStatus;
  installment_1_due_date: string | null;
  installment_1_received_date: string | null;
  installment_1_value: number;
  installment_2_status: InstallmentStatus;
  installment_2_due_date: string | null;
  installment_2_received_date: string | null;
  installment_2_value: number;
  installment_3_status: InstallmentStatus;
  installment_3_due_date: string | null;
  installment_3_received_date: string | null;
  installment_3_value: number;
  installment_4_status: InstallmentStatus;
  installment_4_due_date: string | null;
  installment_4_received_date: string | null;
  installment_4_value: number;
  sold_at: string | null;
  sold_by_membership_id: string | null;
  created_at: string;
  updated_at: string;
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    companyId: row.company_id,
    pdvId: row.pdv_id,
    teamId: row.team_id,
    ownerMembershipId: row.owner_membership_id,
    title: row.title,
    customerName: row.customer_name,
    customerDocument: row.customer_document,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    stage: row.stage,
    consistencyStatus: row.consistency_status,
    consistencyCheckedAt: row.consistency_checked_at,
    consistencyCheckedByMembershipId: row.consistency_checked_by_membership_id,
    consistencyNotes: row.consistency_notes,
    financialTotalValue: row.financial_total_value,
    financialCreditValue: row.financial_credit_value,
    financialDownPayment: row.financial_down_payment,
    financialMonths: row.financial_months,
    financialInstallmentValue: row.financial_installment_value,
    financialIncome: row.financial_income,
    installments: [
      { number: 1, status: row.installment_1_status, dueDate: row.installment_1_due_date, receivedDate: row.installment_1_received_date, value: row.installment_1_value },
      { number: 2, status: row.installment_2_status, dueDate: row.installment_2_due_date, receivedDate: row.installment_2_received_date, value: row.installment_2_value },
      { number: 3, status: row.installment_3_status, dueDate: row.installment_3_due_date, receivedDate: row.installment_3_received_date, value: row.installment_3_value },
      { number: 4, status: row.installment_4_status, dueDate: row.installment_4_due_date, receivedDate: row.installment_4_received_date, value: row.installment_4_value },
    ],
    soldAt: row.sold_at,
    soldByMembershipId: row.sold_by_membership_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const leadRepository = {
  listByScope(db: Database.Database, companyId: string, scope: LeadVisibilityScope): Lead[] {
    if (scope.kind === 'all') {
      const rows = db
        .prepare('SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC')
        .all(companyId) as LeadRow[];
      return rows.map(toLead);
    }

    if (scope.kind === 'ownerOnly') {
      const rows = db
        .prepare(
          'SELECT * FROM leads WHERE company_id = ? AND owner_membership_id = ? ORDER BY created_at DESC',
        )
        .all(companyId, scope.ownerMembershipId) as LeadRow[];
      return rows.map(toLead);
    }

    const pdvIds = scope.pdvIds ?? [];
    const teamIds = scope.teamIds ?? [];
    if (pdvIds.length === 0 && teamIds.length === 0) {
      return [];
    }

    const parts: string[] = [];
    const params: unknown[] = [companyId];

    if (pdvIds.length > 0) {
      parts.push(`pdv_id IN (${pdvIds.map(() => '?').join(', ')})`);
      params.push(...pdvIds);
    }

    if (teamIds.length > 0) {
      parts.push(`team_id IN (${teamIds.map(() => '?').join(', ')})`);
      params.push(...teamIds);
    }

    const query = `SELECT * FROM leads WHERE company_id = ? AND (${parts.join(' OR ')}) ORDER BY created_at DESC`;
    const rows = db.prepare(query).all(...params) as LeadRow[];
    return rows.map(toLead);
  },

  findById(db: Database.Database, companyId: string, leadId: string): Lead | null {
    const row = db.prepare('SELECT * FROM leads WHERE company_id = ? AND id = ? LIMIT 1').get(companyId, leadId) as LeadRow | undefined;
    return row ? toLead(row) : null;
  },

  create(
    db: Database.Database,
    input: {
      id: string;
      companyId: string;
      pdvId?: string | null;
      teamId?: string | null;
      ownerMembershipId: string;
      title: string;
      customerName: string;
      customerDocument?: string | null;
      customerEmail?: string | null;
      customerPhone?: string | null;
      financialTotalValue?: number;
      financialCreditValue?: number;
      financialDownPayment?: number;
      financialMonths?: number | null;
      financialInstallmentValue?: number | null;
      financialIncome?: number | null;
    },
  ): Lead {
    db.prepare(
      `
      INSERT INTO leads (
        id, company_id, pdv_id, team_id, owner_membership_id, title, customer_name,
        customer_document, customer_email, customer_phone,
        financial_total_value, financial_credit_value, financial_down_payment,
        financial_months, financial_installment_value, financial_income
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      input.id,
      input.companyId,
      input.pdvId ?? null,
      input.teamId ?? null,
      input.ownerMembershipId,
      input.title,
      input.customerName,
      input.customerDocument ?? null,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.financialTotalValue ?? 0,
      input.financialCreditValue ?? 0,
      input.financialDownPayment ?? 0,
      input.financialMonths ?? null,
      input.financialInstallmentValue ?? null,
      input.financialIncome ?? null,
    );

    const created = this.findById(db, input.companyId, input.id);
    if (!created) {
      throw new Error('Failed to load created lead');
    }

    return created;
  },

  update(
    db: Database.Database,
    input: {
      companyId: string;
      leadId: string;
      title?: string;
      customerName?: string;
      customerDocument?: string | null;
      customerEmail?: string | null;
      customerPhone?: string | null;
      pdvId?: string | null;
      teamId?: string | null;
      financialTotalValue?: number;
      financialCreditValue?: number;
      financialDownPayment?: number;
      financialMonths?: number | null;
      financialInstallmentValue?: number | null;
      financialIncome?: number | null;
    },
  ): void {
    db.prepare(
      `
      UPDATE leads
      SET
        title = COALESCE(?, title),
        customer_name = COALESCE(?, customer_name),
        customer_document = COALESCE(?, customer_document),
        customer_email = COALESCE(?, customer_email),
        customer_phone = COALESCE(?, customer_phone),
        pdv_id = COALESCE(?, pdv_id),
        team_id = COALESCE(?, team_id),
        financial_total_value = COALESCE(?, financial_total_value),
        financial_credit_value = COALESCE(?, financial_credit_value),
        financial_down_payment = COALESCE(?, financial_down_payment),
        financial_months = COALESCE(?, financial_months),
        financial_installment_value = COALESCE(?, financial_installment_value),
        financial_income = COALESCE(?, financial_income),
        updated_at = datetime('now')
      WHERE company_id = ? AND id = ?
      `,
    ).run(
      input.title ?? null,
      input.customerName ?? null,
      input.customerDocument ?? null,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.pdvId ?? null,
      input.teamId ?? null,
      input.financialTotalValue ?? null,
      input.financialCreditValue ?? null,
      input.financialDownPayment ?? null,
      input.financialMonths ?? null,
      input.financialInstallmentValue ?? null,
      input.financialIncome ?? null,
      input.companyId,
      input.leadId,
    );
  },

  updateStage(
    db: Database.Database,
    input: {
      companyId: string;
      leadId: string;
      stage: LeadStage;
      consistencyStatus?: ConsistencyStatus;
      consistencyNotes?: string | null;
      consistencyCheckedByMembershipId?: string | null;
      consistencyCheckedAt?: string | null;
    },
  ): void {
    db.prepare(
      `
      UPDATE leads
      SET
        stage = ?,
        consistency_status = COALESCE(?, consistency_status),
        consistency_notes = COALESCE(?, consistency_notes),
        consistency_checked_by_membership_id = COALESCE(?, consistency_checked_by_membership_id),
        consistency_checked_at = COALESCE(?, consistency_checked_at),
        updated_at = datetime('now')
      WHERE company_id = ? AND id = ?
      `,
    ).run(
      input.stage,
      input.consistencyStatus ?? null,
      input.consistencyNotes ?? null,
      input.consistencyCheckedByMembershipId ?? null,
      input.consistencyCheckedAt ?? null,
      input.companyId,
      input.leadId,
    );
  },

  insertConsistencyCheck(
    db: Database.Database,
    input: {
      id: string;
      companyId: string;
      leadId: string;
      status: 'VALID' | 'INCONSISTENT';
      issuesJson: string;
      validatedByMembershipId: string;
    },
  ): LeadConsistencyCheck {
    db.prepare(
      `
      INSERT INTO lead_consistency_checks
      (id, company_id, lead_id, status, issues_json, validated_by_membership_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(input.id, input.companyId, input.leadId, input.status, input.issuesJson, input.validatedByMembershipId);

    const row = db
      .prepare('SELECT * FROM lead_consistency_checks WHERE company_id = ? AND id = ? LIMIT 1')
      .get(input.companyId, input.id) as LeadConsistencyCheck;

    return row;
  },

  insertStageEvent(
    db: Database.Database,
    input: {
      id: string;
      companyId: string;
      leadId: string;
      fromStage: LeadStage | null;
      toStage: LeadStage;
      changedByMembershipId: string;
      reason?: string | null;
    },
  ): LeadStageEvent {
    db.prepare(
      `
      INSERT INTO lead_stage_events
      (id, company_id, lead_id, from_stage, to_stage, changed_by_membership_id, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      input.id,
      input.companyId,
      input.leadId,
      input.fromStage,
      input.toStage,
      input.changedByMembershipId,
      input.reason ?? null,
    );

    const row = db
      .prepare('SELECT * FROM lead_stage_events WHERE company_id = ? AND id = ? LIMIT 1')
      .get(input.companyId, input.id) as LeadStageEvent;

    return row;
  },

  listConsistencyHistory(db: Database.Database, companyId: string, leadId: string): LeadConsistencyCheck[] {
    return db
      .prepare(
        'SELECT * FROM lead_consistency_checks WHERE company_id = ? AND lead_id = ? ORDER BY validated_at DESC',
      )
      .all(companyId, leadId) as LeadConsistencyCheck[];
  },

  markAsSold(
    db: Database.Database,
    input: {
      companyId: string;
      leadId: string;
      soldByMembershipId: string;
      installments: Array<{
        number: 1 | 2 | 3 | 4;
        dueDate: string;
        value: number;
      }>;
    },
  ): void {
    const now = new Date().toISOString();
    const fields: string[] = [
      'stage = ?',
      'sold_at = ?',
      'sold_by_membership_id = ?',
      'updated_at = datetime(\'now\')',
    ];
    const values: unknown[] = ['ADESÃO', now, input.soldByMembershipId];

    for (const inst of input.installments) {
      fields.push(`installment_${inst.number}_due_date = ?`);
      fields.push(`installment_${inst.number}_value = ?`);
      values.push(inst.dueDate, inst.value);
    }

    const query = `UPDATE leads SET ${fields.join(', ')} WHERE company_id = ? AND id = ?`;
    values.push(input.companyId, input.leadId);

    db.prepare(query).run(...values);
  },

  updateInstallment(
    db: Database.Database,
    input: {
      companyId: string;
      leadId: string;
      installmentNumber: 1 | 2 | 3 | 4;
      status: InstallmentStatus;
      receivedDate?: string | null;
    },
  ): void {
    const fields = [`installment_${input.installmentNumber}_status = ?`];
    const values: unknown[] = [input.status];

    if (input.receivedDate !== undefined) {
      fields.push(`installment_${input.installmentNumber}_received_date = ?`);
      values.push(input.receivedDate);
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(input.companyId, input.leadId);

    const query = `UPDATE leads SET ${fields.join(', ')} WHERE company_id = ? AND id = ?`;
    db.prepare(query).run(...values);
  },

  listSold(db: Database.Database, companyId: string): Lead[] {
    const rows = db
      .prepare('SELECT * FROM leads WHERE company_id = ? AND stage = ? ORDER BY sold_at DESC')
      .all(companyId, 'ADESÃO') as LeadRow[];
    return rows.map(toLead);
  },
};
