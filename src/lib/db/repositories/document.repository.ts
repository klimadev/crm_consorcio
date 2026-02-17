import type Database from 'better-sqlite3';
import type { DocumentType, LeadDocument } from '@/types';

interface LeadDocumentRow {
  id: string;
  company_id: string;
  lead_id: string;
  document_type: DocumentType;
  file_name: string;
  storage_key: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by_membership_id: string;
  created_at: string;
}

function toLeadDocument(row: LeadDocumentRow): LeadDocument {
  return {
    id: row.id,
    companyId: row.company_id,
    leadId: row.lead_id,
    documentType: row.document_type,
    fileName: row.file_name,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    uploadedByMembershipId: row.uploaded_by_membership_id,
    createdAt: row.created_at,
  };
}

export const documentRepository = {
  listByLead(db: Database.Database, companyId: string, leadId: string): LeadDocument[] {
    const rows = db
      .prepare('SELECT * FROM lead_documents WHERE company_id = ? AND lead_id = ? ORDER BY created_at DESC')
      .all(companyId, leadId) as LeadDocumentRow[];
    return rows.map(toLeadDocument);
  },

  upsert(
    db: Database.Database,
    input: {
      id: string;
      companyId: string;
      leadId: string;
      documentType: DocumentType;
      fileName: string;
      storageKey: string;
      mimeType?: string | null;
      fileSizeBytes?: number | null;
      uploadedByMembershipId: string;
    },
  ): LeadDocument {
    db.prepare(
      `
      INSERT INTO lead_documents (
        id, company_id, lead_id, document_type, file_name,
        storage_key, mime_type, file_size_bytes, uploaded_by_membership_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(company_id, lead_id, document_type)
      DO UPDATE SET
        file_name = excluded.file_name,
        storage_key = excluded.storage_key,
        mime_type = excluded.mime_type,
        file_size_bytes = excluded.file_size_bytes,
        uploaded_by_membership_id = excluded.uploaded_by_membership_id,
        created_at = datetime('now')
      `,
    ).run(
      input.id,
      input.companyId,
      input.leadId,
      input.documentType,
      input.fileName,
      input.storageKey,
      input.mimeType ?? null,
      input.fileSizeBytes ?? null,
      input.uploadedByMembershipId,
    );

    const row = db
      .prepare(
        'SELECT * FROM lead_documents WHERE company_id = ? AND lead_id = ? AND document_type = ? LIMIT 1',
      )
      .get(input.companyId, input.leadId, input.documentType) as LeadDocumentRow | undefined;

    if (!row) {
      throw new Error('Failed to upsert lead document');
    }

    return toLeadDocument(row);
  },

  deleteByType(db: Database.Database, input: { companyId: string; leadId: string; documentType: DocumentType }): void {
    db.prepare('DELETE FROM lead_documents WHERE company_id = ? AND lead_id = ? AND document_type = ?').run(
      input.companyId,
      input.leadId,
      input.documentType,
    );
  },
};
