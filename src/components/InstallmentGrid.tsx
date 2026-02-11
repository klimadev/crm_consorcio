'use client';

import React from 'react';
import type { Installment, InstallmentStatus } from '@/types';
import { INSTALLMENT_STATUS_COLORS, INSTALLMENT_STATUS_LABELS } from '@/types';
import { CalendarDays, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface InstallmentGridProps {
  installments: Installment[];
  saleId: string;
  canEdit: boolean;
  onUpdate: (
    saleId: string,
    installmentNumber: 1 | 2 | 3 | 4,
    status: InstallmentStatus,
    receivedDate?: string
  ) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateShort(iso: string | null) {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
  } catch {
    return '--';
  }
}

function toISOFromDateInput(value: string) {
  // Use noon UTC to avoid timezone date shifting.
  return value ? new Date(`${value}T12:00:00Z`).toISOString() : '';
}

function getDerivedStatus(installment: Installment): InstallmentStatus {
  if (installment.status !== 'PENDING') return installment.status;
  if (!installment.dueDate) return 'PENDING';
  const due = new Date(installment.dueDate);
  if (Number.isNaN(due.getTime())) return 'PENDING';
  const today = new Date();
  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? 'OVERDUE' : 'PENDING';
}

function StatusIcon({ status }: { status: InstallmentStatus }) {
  if (status === 'RECEIVED') return <CheckCircle2 size={14} className="text-green-700" />;
  if (status === 'OVERDUE') return <AlertTriangle size={14} className="text-red-700" />;
  return <Clock size={14} className="text-slate-600" />;
}

export const InstallmentGrid: React.FC<InstallmentGridProps> = ({ installments, saleId, canEdit, onUpdate }) => {
  const ordered = ([1, 2, 3, 4] as const).map((n) => installments.find((i) => i.number === n) ?? {
    number: n,
    status: 'PENDING' as const,
    dueDate: null,
    receivedDate: null,
    value: 0,
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ordered.map((inst) => {
        const derivedStatus = getDerivedStatus(inst);
        const showStatus = derivedStatus;
        const statusPill = INSTALLMENT_STATUS_COLORS[showStatus];

        return (
          <div
            key={inst.number}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{inst.number}ª parcela</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{formatCurrency(inst.value)}</div>
              </div>

              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${statusPill}`}>
                <StatusIcon status={showStatus} /> {INSTALLMENT_STATUS_LABELS[showStatus]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <CalendarDays size={12} className="text-slate-400" /> Venc.
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{formatDateShort(inst.dueDate)}</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <CheckCircle2 size={12} className="text-slate-400" /> Rec.
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{formatDateShort(inst.receivedDate)}</div>
              </div>
            </div>

            {canEdit ? (
              <div className="mt-3">
                <div className="grid grid-cols-3 gap-2">
                  {(['PENDING', 'RECEIVED', 'OVERDUE'] as const).map((next) => {
                    const isActive = inst.status === next;
                    const base =
                      'w-full rounded-lg border px-2 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';
                    const active = isActive
                      ? next === 'RECEIVED'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : next === 'OVERDUE'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

                    return (
                      <button
                        key={next}
                        type="button"
                        className={`${base} ${active}`}
                        onClick={() => {
                          if (next === 'RECEIVED') {
                            onUpdate(saleId, inst.number, next, new Date().toISOString());
                            return;
                          }
                          onUpdate(saleId, inst.number, next);
                        }}
                        title={INSTALLMENT_STATUS_LABELS[next]}
                      >
                        {INSTALLMENT_STATUS_LABELS[next]}
                      </button>
                    );
                  })}
                </div>

                {inst.status === 'RECEIVED' && (
                  <div className="mt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Data de recebimento</label>
                    <input
                      type="date"
                      value={inst.receivedDate ? inst.receivedDate.slice(0, 10) : ''}
                      onChange={(e) => {
                        const iso = toISOFromDateInput(e.target.value);
                        if (iso) onUpdate(saleId, inst.number, 'RECEIVED', iso);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">Somente ADMIN/MANAGER pode editar.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
