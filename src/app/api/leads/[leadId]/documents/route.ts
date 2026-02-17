import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { removeLeadDocument, upsertLeadDocument } from '@/lib/domain/leads/lead.service';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import type { DocumentType } from '@/types';

const docTypes: DocumentType[] = ['RG', 'CPF', 'CONTRACT'];

function asDocumentType(value: string): DocumentType {
  if (!docTypes.includes(value as DocumentType)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid document type.', 400);
  }
  return value as DocumentType;
}

export async function POST(request: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    const body = await parseJsonBody<{
      documentType: string;
      fileName: string;
      storageKey?: string;
      mimeType?: string;
      fileSizeBytes?: number;
    }>(request);

    upsertLeadDocument(getDb(), ctx, leadId, {
      documentType: asDocumentType(requireString(body.documentType, 'documentType')),
      fileName: requireString(body.fileName, 'fileName'),
      storageKey: body.storageKey?.trim() || `${leadId}/${Date.now()}-${body.fileName}`,
      mimeType: body.mimeType,
      fileSizeBytes: body.fileSizeBytes,
    });

    return ok({ uploaded: true }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    const body = await parseJsonBody<{ documentType: string }>(request);

    removeLeadDocument(getDb(), ctx, leadId, asDocumentType(requireString(body.documentType, 'documentType')));
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
